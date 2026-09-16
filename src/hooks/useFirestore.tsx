import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  documentId,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { Recipe, Menus, RecipeCategory, MenuItem } from "../types";
import { defaultRecipeCategories } from "../data/sampleData";
import { ARCHIVE_DAYS, DAYS_AFTER, getDateKey } from "../utils/helpers";
import { readLocalCache, writeLocalCacheDebounced } from "../utils/localCache";

/** Firestoreに書き込む前に undefined のフィールドを除去する */
function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

/**
 * Firestoreとmenus・recipes・categoriesをリアルタイム同期するHook
 *
 * setMenus / setRecipes / setCategories は React.Dispatch と同じシグネチャで
 * ローカル状態の即時更新 + Firestoreへの非同期書き込みを同時に行う。
 */
export function useFirestore(householdId: string | null) {
  const [menus, setMenusLocal] = useState<Menus>({});
  const [recipes, setRecipesLocal] = useState<Recipe[]>([]);
  const [categories, setCategoriesLocal] = useState<RecipeCategory[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [menusServerConfirmedFor, setMenusServerConfirmedFor] = useState<string | null>(null);
  const [recipesServerConfirmedFor, setRecipesServerConfirmedFor] = useState<string | null>(null);
  const menusServerConfirmedRef = useRef<string | null>(null);
  const recipesServerConfirmedRef = useRef<string | null>(null);

  // ─── Firestoreリスナー ───────────────────────────────────────────────────────
  useEffect(() => {
    menusServerConfirmedRef.current = null;
    recipesServerConfirmedRef.current = null;
    setMenusServerConfirmedFor(null);
    setRecipesServerConfirmedFor(null);

    if (!householdId) {
      setMenusLocal({});
      setRecipesLocal([]);
      setCategoriesLocal([]);
      setLoadingData(false);
      setLoadError(null);
      return;
    }
    setLoadingData(true);
    setLoadError(null);
    setMenusLocal({});
    setRecipesLocal([]);
    setCategoriesLocal([]);
    const base = `households/${householdId}`;
    let active = true;
    const snapshotReceived = {
      menus: false,
      recipes: false,
      categories: false,
    };

    void Promise.all([
      readLocalCache<Menus>(householdId, "menus"),
      readLocalCache<Recipe[]>(householdId, "recipes"),
      readLocalCache<RecipeCategory[]>(householdId, "categories"),
    ]).then(([cachedMenus, cachedRecipes, cachedCategories]) => {
      if (!active) return;

      if (!snapshotReceived.menus && cachedMenus !== null) {
        setMenusLocal(cachedMenus);
      }
      if (!snapshotReceived.recipes && cachedRecipes !== null) {
        setRecipesLocal(cachedRecipes);
      }
      if (!snapshotReceived.categories && cachedCategories !== null) {
        setCategoriesLocal(cachedCategories);
      }
      setLoadingData(false);
    });

    const handleSnapshotError = (label: string) => (err: unknown) => {
      if (!active) return;
      console.error(`[useFirestore] ${label} snapshot error:`, err);
      setLoadError(`データの取得に失敗しました（${label}）`);
      setLoadingData(false);
    };

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - ARCHIVE_DAYS);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + DAYS_AFTER);
    const menusQuery = query(
      collection(db, `${base}/menus`),
      where(documentId(), ">=", getDateKey(startDate)),
      where(documentId(), "<=", getDateKey(endDate))
    );

    const unsubMenus = onSnapshot(
      menusQuery,
      { includeMetadataChanges: true },
      (snap) => {
        if (!active) return;
        snapshotReceived.menus = true;
        const data: Menus = {};
        snap.docs.forEach((d) => { data[d.id] = (d.data().items ?? []) as MenuItem[]; });
        setMenusLocal((prev) =>
          JSON.stringify(prev) === JSON.stringify(data) ? prev : data
        );
        writeLocalCacheDebounced(householdId, "menus", data);
        if (!snap.metadata.fromCache) {
          menusServerConfirmedRef.current = householdId;
          setMenusServerConfirmedFor(householdId);
        }
        setLoadingData(false);
      },
      handleSnapshotError("menus")
    );

    const unsubRecipes = onSnapshot(
      collection(db, `${base}/recipes`),
      { includeMetadataChanges: true },
      (snap) => {
        if (!active) return;
        snapshotReceived.recipes = true;
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe));
        setRecipesLocal((prev) =>
          JSON.stringify(prev) === JSON.stringify(data) ? prev : data
        );
        writeLocalCacheDebounced(householdId, "recipes", data);
        if (!snap.metadata.fromCache) {
          recipesServerConfirmedRef.current = householdId;
          setRecipesServerConfirmedFor(householdId);
        }
        setLoadingData(false);
      },
      handleSnapshotError("recipes")
    );

    const unsubCategories = onSnapshot(
      collection(db, `${base}/categories`),
      (snap) => {
        if (!active) return;
        snapshotReceived.categories = true;
        const data = snap.docs.map((d) => ({ id: d.id, name: d.data().name as string }));
        setCategoriesLocal((prev) =>
          JSON.stringify(prev) === JSON.stringify(data) ? prev : data
        );
        writeLocalCacheDebounced(householdId, "categories", data);
        setLoadingData(false);

        if (snap.empty && !snap.metadata.fromCache) {
          initDefaultCategories(householdId).catch(
            handleSnapshotError("categories init")
          );
        }
      },
      handleSnapshotError("categories")
    );

    return () => {
      active = false;
      unsubMenus(); unsubRecipes(); unsubCategories();
    };
  }, [householdId]);

  // ─── 献立専用レシピの自動削除（アーカイブ期間外になったら削除） ──────────────
  // menus/recipes が更新されるたびに評価し、対象があれば削除する。
  // 削除後はonSnapshotでrecipesが更新され、stale条件を満たすものがなくなれば再帰せず収束する。
  useEffect(() => {
    if (
      loadingData ||
      !householdId ||
      menusServerConfirmedRef.current !== householdId ||
      recipesServerConfirmedRef.current !== householdId ||
      menusServerConfirmedFor !== householdId ||
      recipesServerConfirmedFor !== householdId
    ) return;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const archiveCutoff = new Date(today);
    archiveCutoff.setDate(archiveCutoff.getDate() - ARCHIVE_DAYS);

    const staleRecipes = recipes.filter((r) => r.showInList === false);
    staleRecipes.forEach((recipe) => {
      const refDates = Object.entries(menus)
        .filter(([, items]) => items.some((item) => item.recipeId === recipe.id))
        // ローカルタイムの0時として解釈し、UTC解釈による日跨ぎズレを防ぐ
        .map(([dateKey]) => new Date(dateKey + "T00:00:00"));

      const allExpired =
        refDates.length === 0 ||
        refDates.every((d) => d < archiveCutoff);

      if (allExpired) {
        deleteDoc(doc(db, `households/${householdId}/recipes`, recipe.id)).catch(console.error);
        // ローカル状態はonSnapshotで自動更新されるので明示的なsetは不要
      }
    });
  }, [loadingData, householdId, recipes, menus, menusServerConfirmedFor, recipesServerConfirmedFor]);

  // ─── デフォルトカテゴリ初期書き込み ────────────────────────────────────────
  const initDefaultCategories = async (hid: string): Promise<void> => {
    const batch = writeBatch(db);
    defaultRecipeCategories.forEach((cat) => {
      batch.set(doc(db, `households/${hid}/categories`, cat.id), { name: cat.name });
    });
    await batch.commit();
  };

  // ─── Firestore書き込みヘルパー ──────────────────────────────────────────────
  const writeMenuDate = (hid: string, dateKey: string, items: MenuItem[]): void => {
    const ref = doc(db, `households/${hid}/menus`, dateKey);
    if (items.length === 0) {
      deleteDoc(ref).catch(console.error);
    } else {
      setDoc(ref, { items }).catch(console.error);
    }
  };

  // ─── レシピと献立を同一バッチで保存 ──────────────────────────────────────────
  const saveRecipeWithMenu = useCallback(
    (recipe: Recipe, dateKey: string, updateItems: (items: MenuItem[]) => MenuItem[]): void => {
      setRecipesLocal((prev) => {
        const index = prev.findIndex((item) => item.id === recipe.id);
        if (index === -1) return [...prev, recipe];
        const next = [...prev];
        next[index] = recipe;
        return next;
      });

      setMenusLocal((prev) => {
        const items = updateItems(prev[dateKey] ?? []);
        const next = { ...prev };
        if (items.length === 0) delete next[dateKey];
        else next[dateKey] = items;

        if (householdId) {
          const batch = writeBatch(db);
          const { id, ...recipeData } = recipe;
          batch.set(
            doc(db, `households/${householdId}/recipes`, id),
            stripUndefined(recipeData)
          );

          const menuRef = doc(db, `households/${householdId}/menus`, dateKey);
          if (items.length === 0) {
            batch.delete(menuRef);
          } else {
            batch.set(menuRef, stripUndefined({ items }));
          }
          batch.commit().catch(console.error);
        }

        return next;
      });
    },
    [householdId]
  );

  // ─── setMenus（React.Dispatch互換） ─────────────────────────────────────────
  const setMenus = useCallback(
    (updater: React.SetStateAction<Menus>): void => {
      setMenusLocal((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (householdId) {
          const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
          allKeys.forEach((dateKey) => {
            if (JSON.stringify(prev[dateKey]) !== JSON.stringify(next[dateKey])) {
              writeMenuDate(householdId, dateKey, next[dateKey] ?? []);
            }
          });
        }
        return next;
      });
    },
    [householdId]
  );

  // ─── setRecipes（React.Dispatch互換） ────────────────────────────────────────
  const setRecipes = useCallback(
    (updater: React.SetStateAction<Recipe[]>): void => {
      setRecipesLocal((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (householdId) {
          // 追加・更新
          next.forEach((recipe) => {
            const old = prev.find((r) => r.id === recipe.id);
            if (!old || JSON.stringify(old) !== JSON.stringify(recipe)) {
              const { id, ...data } = recipe;
              setDoc(doc(db, `households/${householdId}/recipes`, id), stripUndefined(data)).catch(console.error);
            }
          });
          // 削除
          prev.forEach((recipe) => {
            if (!next.find((r) => r.id === recipe.id)) {
              deleteDoc(doc(db, `households/${householdId}/recipes`, recipe.id)).catch(console.error);
            }
          });
        }
        return next;
      });
    },
    [householdId]
  );

  // ─── setCategories（React.Dispatch互換） ─────────────────────────────────────
  const setCategories = useCallback(
    (updater: React.SetStateAction<RecipeCategory[]>): void => {
      setCategoriesLocal((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (householdId) {
          const batch = writeBatch(db);
          // 削除されたカテゴリ
          const deletedIds: string[] = [];
          prev.forEach((cat) => {
            if (!next.find((c) => c.id === cat.id)) {
              batch.delete(doc(db, `households/${householdId}/categories`, cat.id));
              deletedIds.push(cat.id);
            }
          });
          // 追加・更新されたカテゴリ
          next.forEach((cat) => {
            const old = prev.find((c) => c.id === cat.id);
            if (!old || old.name !== cat.name) {
              batch.set(doc(db, `households/${householdId}/categories`, cat.id), { name: cat.name });
            }
          });
          batch.commit().catch(console.error);

          // 削除されたカテゴリを参照しているレシピの categoryIds からも除去（孤立参照を防ぐ）
          if (deletedIds.length > 0) {
            setRecipesLocal((prevRecipes) => {
              const updated = prevRecipes.map((r) => {
                if (!r.categoryIds || r.categoryIds.length === 0) return r;
                const filtered = r.categoryIds.filter((cid) => !deletedIds.includes(cid));
                if (filtered.length === r.categoryIds.length) return r;
                const updatedRecipe = { ...r, categoryIds: filtered };
                // Firestoreにも反映
                const { id, ...data } = updatedRecipe;
                setDoc(doc(db, `households/${householdId}/recipes`, id), stripUndefined(data)).catch(console.error);
                return updatedRecipe;
              });
              return updated;
            });
          }
        }
        return next;
      });
    },
    [householdId]
  );

  return {
    menus,
    recipes,
    categories,
    loadingData,
    loadError,
    setMenus,
    setRecipes,
    setCategories,
    saveRecipeWithMenu,
  };
}

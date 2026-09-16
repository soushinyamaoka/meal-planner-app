import { useState, useEffect } from "react";
import { collection, documentId, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { NurseryMenus } from "../types";
import { readLocalCache, writeLocalCacheDebounced } from "../utils/localCache";

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isValidDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() + 1 === month
    && date.getUTCDate() === day;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 保育園献立(households/{householdId}/nurseryMenus)をFirestoreとリアルタイム同期するHook
 *
 * 書き込みはscripts/importNurseryMenu.mjsのみが行う。アプリ側は読み取り専用。
 */
export function useNurseryMenus(householdId: string | null) {
  const [nurseryMenus, setNurseryMenus] = useState<NurseryMenus>({});
  const [loadingNurseryMenus, setLoadingNurseryMenus] = useState(true);
  const [nurseryMenuError, setNurseryMenuError] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) {
      setNurseryMenus({});
      setLoadingNurseryMenus(false);
      setNurseryMenuError(null);
      return;
    }
    setLoadingNurseryMenus(true);
    setNurseryMenus({});
    setNurseryMenuError(null);
    let active = true;
    let snapshotReceived = false;

    void readLocalCache<NurseryMenus>(householdId, "nurseryMenus").then((cachedMenus) => {
      if (!active) return;
      if (!snapshotReceived && cachedMenus !== null) {
        setNurseryMenus(cachedMenus);
      }
      setLoadingNurseryMenus(false);
    });

    const today = new Date();
    const startKey = toDateKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    const endKey = toDateKey(new Date(today.getFullYear(), today.getMonth() + 2, 0));
    const nurseryMenusQuery = query(
      collection(db, `households/${householdId}/nurseryMenus`),
      where(documentId(), ">=", startKey),
      where(documentId(), "<=", endKey)
    );

    const unsub = onSnapshot(
      nurseryMenusQuery,
      (snap) => {
        if (!active) return;
        snapshotReceived = true;
        const data: NurseryMenus = {};
        snap.docs.forEach((d) => {
          if (!isValidDateKey(d.id)) return;
          const docData = d.data();
          data[d.id] = {
            menu: toStringArray(docData.menu),
            snack: toStringArray(docData.snack),
          };
        });
        setNurseryMenus(data);
        writeLocalCacheDebounced(householdId, "nurseryMenus", data);
        setNurseryMenuError(null);
        setLoadingNurseryMenus(false);
      },
      (err) => {
        if (!active) return;
        console.error("[useNurseryMenus] snapshot error:", err.code);
        setNurseryMenuError("給食データの取得に失敗しました");
        setLoadingNurseryMenus(false);
      }
    );

    return () => {
      active = false;
      unsub();
    };
  }, [householdId]);

  return { nurseryMenus, loadingNurseryMenus, nurseryMenuError };
}

import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { getDateKey, formatDate, getEmoji, genId } from "../utils/helpers";
import { fetchCoopIngredients, triggerCoopFetch, suggestCoopRecipes, createCoopMealPlan, classifyCoopProduct } from "../api";
import { COOP_CATEGORIES } from "../data/sampleData";
import { Recipe, Menus, MenuItem, CoopData, CoopCategoryKey, SuggestResult, SuggestRecipe, PlanResult, PlanDayItem } from "../types";
import { s } from "../styles/appStyles";
import { CoopOrderHistory } from "../components/CoopOrderHistory";
import { AiMealPrompt } from "../components/AiMealPrompt";

// ═══════════════════════════════════════════
// COOP Tab
// ═══════════════════════════════════════════
type CoopTabProps = {
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  menus: Menus;
  setMenus: React.Dispatch<React.SetStateAction<Menus>>;
  saveRecipesWithMenus: (recipes: Recipe[], menuUpdates: Record<string, MenuItem[]>) => void;
};

export function CoopTab({ recipes, setRecipes, menus, setMenus, saveRecipesWithMenus }: CoopTabProps) {
  const [coopData, setCoopData] = useState<CoopData | null>(null);
  const [fetching, setFetching] = useState<boolean>(false); // データ取得中フラグ
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedCat, setExpandedCat] = useState<Set<string>>(new Set(["ingredients", "kits"]));
  const [view, setView] = useState<"list" | "loading" | "suggestResult" | "planResult" | "history" | "aiPrompt">("list");
  const [suggestResult, setSuggestResult] = useState<SuggestResult | null>(null);
  const [planResult, setPlanResult] = useState<PlanResult | null>(null);
  const [savedFlags, setSavedFlags] = useState<Record<string, boolean>>({});
  const [planStartDateKey, setPlanStartDateKey] = useState<string | null>(null);
  const [planConflictDates, setPlanConflictDates] = useState<string[] | null>(null);
  const [planAdding, setPlanAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<{ item: CoopData[CoopCategoryKey][number]; category: string } | null>(null);
  const [editingCategory, setEditingCategory] = useState("");
  const [classifying, setClassifying] = useState(false);
  const planAddInProgress = useRef(false);
  const menusRef = useRef(menus);
  menusRef.current = menus;
  const savedFlagsRef = useRef(savedFlags);
  savedFlagsRef.current = savedFlags;
  const requestInProgress = useRef(false);
  const loadedData = useRef<CoopData | null>(null);

  const updateLoadedData = (data: CoopData): void => {
    const previous = loadedData.current;
    if (!previous || previous.order_date !== data.order_date || previous.parsed_at !== data.parsed_at) {
      setSelected(new Set());
    } else {
      const newItems = new Map<string, string>();
      const identityByOldKey = new Map<string, string>();
      for (const cat of COOP_CATEGORIES) {
        for (const item of previous[cat.key] || []) {
          const identity = `${item.order_no}\u0000${item.original_name}`;
          const key = `${cat.key}:${item.order_no}`;
          identityByOldKey.set(key, identity);
        }
        for (const item of data[cat.key] || []) newItems.set(`${item.order_no}\u0000${item.original_name}`, `${cat.key}:${item.order_no}`);
      }
      setSelected(current => {
        const next = new Set<string>();
        current.forEach(key => {
          const identity = identityByOldKey.get(key);
          const newKey = identity ? newItems.get(identity) : undefined;
          if (newKey) next.add(newKey);
        });
        return next;
      });
    }
    loadedData.current = data;
    setCoopData(data);
  };

  const loadSavedIngredients = async (): Promise<void> => {
    if (requestInProgress.current) return;
    requestInProgress.current = true;
    setFetching(true);
    setError(null);
    try {
      const data = await fetchCoopIngredients();
      updateLoadedData(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError("一覧の読み込みに失敗しました: " + msg);
    } finally {
      requestInProgress.current = false;
      setFetching(false);
    }
  };

  const refreshFromMail = async (): Promise<void> => {
    if (requestInProgress.current) return;
    requestInProgress.current = true;
    setFetching(true);
    setError(null);
    let fetchMessage: string | null = null;
    try {
      const fetchResult = await triggerCoopFetch(14);
      if (fetchResult.status === "no_data") fetchMessage = "新しい注文データが見つかりませんでした。保存済み一覧を表示しています。";
      else if (fetchResult.status === "busy") fetchMessage = "別の取込処理を実行中です。保存済み一覧を表示しています。";
      else fetchMessage = "メール取得を完了しました。";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      fetchMessage = "メール取得に失敗しました: " + msg;
    }

    try {
      const data = await fetchCoopIngredients();
      updateLoadedData(data);
      setError(fetchMessage);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`${fetchMessage ? `${fetchMessage} ` : ""}保存済み一覧の読み込みに失敗しました: ${msg}`);
    } finally {
      requestInProgress.current = false;
      setFetching(false);
    }
  };

  useEffect(() => { void loadSavedIngredients(); }, []);

  const toggleSelect = (k: string): void => {
    setSelected(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  };
  const openProductEditor = (item: CoopData[CoopCategoryKey][number], category: string): void => {
    setEditingProduct({ item, category });
    setEditingCategory(category);
    setError(null);
  };
  const saveProductCategory = async (): Promise<void> => {
    if (!editingProduct || classifying || requestInProgress.current) return;
    const originalName = editingProduct.item.original_name?.trim();
    if (!originalName || editingCategory === editingProduct.category) return;
    requestInProgress.current = true;
    setClassifying(true);
    setFetching(true);
    setError(null);
    try {
      await classifyCoopProduct(editingProduct.item.original_name, editingCategory);
      try {
        const data = await fetchCoopIngredients();
        updateLoadedData(data);
        setEditingProduct(null);
      } catch (e) {
        const message = e instanceof Error ? e.message : "通信エラー";
        setError(`分類は送信されましたが、一覧を再取得できず反映結果を確認できません。一覧を再読み込みしてください。 (${message})`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "通信エラー";
      setError(`分類結果を確認できません。現在の一覧を保持しています。再読み込みで反映を確認してください。 (${message})`);
    } finally {
      requestInProgress.current = false;
      setClassifying(false);
      setFetching(false);
    }
  };
  const toggleCategory = (k: string): void => {
    setExpandedCat(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  };
  const selectAllInCategory = (catKey: CoopCategoryKey): void => {
    if (!coopData) return;
    const keys = (coopData[catKey] || []).map(i => `${catKey}:${i.order_no}`);
    setSelected(p => {
      const n = new Set(p);
      keys.every(k => n.has(k)) ? keys.forEach(k => n.delete(k)) : keys.forEach(k => n.add(k));
      return n;
    });
  };
  const getSelectedNames = (): string[] => {
    if (!coopData) return [];
    const names: string[] = [];
    for (const cat of COOP_CATEGORIES) {
      for (const item of (coopData[cat.key] || [])) {
        if (selected.has(`${cat.key}:${item.order_no}`)) names.push(item.name);
      }
    }
    return names;
  };

  if (view === "history") return <CoopOrderHistory onBack={() => setView("list")} />;
  if (view === "aiPrompt") return <AiMealPrompt selectedNames={getSelectedNames()} menus={menus} recipes={recipes} saveRecipesWithMenus={saveRecipesWithMenus} onBack={() => setView("list")} />;

  const shortcutButtons = (
    <View style={{ flexDirection: "row", gap: 8, marginBottom: 12, alignSelf: "stretch" }}>
      <TouchableOpacity onPress={() => setView("history")} style={{ flex: 1, padding: 11, backgroundColor: "#f5ebe2", borderRadius: 10, alignItems: "center" }}><Text style={{ color: "#6a5d50", fontWeight: "700", fontSize: 12 }}>🕘 過去の注文</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setView("aiPrompt")} style={{ flex: 1, padding: 11, backgroundColor: "#d4725c", borderRadius: 10, alignItems: "center" }}><Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>🤖 AIに献立を相談</Text></TouchableOpacity>
    </View>
  );

  const handleSuggest = async (): Promise<void> => {
    const names = getSelectedNames(); if (names.length === 0) return;
    setView("loading"); setSuggestResult(null); setSavedFlags({});
    try { const r = await suggestCoopRecipes(names); setSuggestResult(r); setView("suggestResult"); }
    catch { setError("レシピ提案に失敗しました"); setView("list"); }
  };
  const handlePlan = async (): Promise<void> => {
    const names = getSelectedNames(); if (names.length === 0) return;
    const startDate = new Date(); startDate.setHours(0, 0, 0, 0);
    setPlanStartDateKey(getDateKey(startDate));
    setPlanConflictDates(null); setView("loading"); setPlanResult(null); setSavedFlags({});
    savedFlagsRef.current = {};
    try { const r = await createCoopMealPlan(names); setPlanResult(r); setView("planResult"); }
    catch { setError("献立作成に失敗しました"); setView("list"); }
  };
  const handleSaveRecipe = (r: SuggestRecipe, key: string): void => {
    const id = genId();
    const base = { id, name: r.name, ingredients: r.ingredients || [], steps: r.steps || [] };
    const recipe: Recipe = r.url ? { ...base, url: r.url } : base;
    setRecipes(p => [...p, recipe]);
    setSavedFlags(p => ({ ...p, [key]: true }));
  };
  const getPlanDateKey = (idx: number): string => {
    const d = new Date(`${planStartDateKey || getDateKey(new Date())}T00:00:00`);
    d.setDate(d.getDate() + idx);
    return getDateKey(d);
  };
  const getPendingPlanDays = (): { dayItem: PlanDayItem; idx: number; dateKey: string }[] =>
    (planResult?.plan || []).flatMap((dayItem, idx) => {
      if (savedFlagsRef.current[`plan-${dayItem.day}`]) return [];
      return [{ dayItem, idx, dateKey: getPlanDateKey(idx) }];
    });
  const getPlanConflictDates = (): string[] => getPendingPlanDays()
    .filter(item => (menusRef.current[item.dateKey]?.length || 0) > 0)
    .map(item => item.dateKey);
  const formatPlanDate = (dateKey: string): string => {
    const d = new Date(`${dateKey}T00:00:00`);
    const pd = formatDate(d);
    return `${pd.month}/${pd.day}(${pd.weekday})`;
  };
  const handleAddToMealFromPlan = (dayItem: PlanDayItem, dateKey: string): void => {
    const recipeId = genId();
    const r = dayItem.recipe;
    const url = dayItem.web_recipe?.url;
    const base = { id: recipeId, name: r.name, ingredients: r.ingredients || [], steps: r.steps || [] };
    const recipe: Recipe = url ? { ...base, url } : base;
    setRecipes(p => [...p, recipe]);
    setMenus(p => ({ ...p, [dateKey]: [...(p[dateKey] || []), { id: genId(), name: r.name, recipeId }] }));
    const key = `plan-${dayItem.day}`;
    const nextFlags = { ...savedFlagsRef.current, [key]: true };
    savedFlagsRef.current = nextFlags;
    setSavedFlags(nextFlags);
  };
  const handleStartAddAllPlans = (): void => {
    if (planAddInProgress.current || !planResult) return;
    const pending = getPendingPlanDays();
    if (pending.length === 0) return;
    const conflicts = getPlanConflictDates();
    if (conflicts.length > 0) {
      setPlanConflictDates(conflicts);
      return;
    }
    planAddInProgress.current = true;
    setPlanAdding(true);
    pending.forEach(({ dayItem, dateKey }) => handleAddToMealFromPlan(dayItem, dateKey));
    planAddInProgress.current = false;
    setPlanAdding(false);
    setPlanConflictDates(null);
  };
  const handleConfirmAddAllPlans = (): void => {
    if (planAddInProgress.current || !planResult) return;
    const conflicts = getPlanConflictDates();
    const newlyConflicted = conflicts.filter(dateKey => !planConflictDates?.includes(dateKey));
    if (newlyConflicted.length > 0) {
      setPlanConflictDates(conflicts);
      return;
    }
    planAddInProgress.current = true;
    setPlanAdding(true);
    getPendingPlanDays().forEach(({ dayItem, dateKey }) => handleAddToMealFromPlan(dayItem, dateKey));
    planAddInProgress.current = false;
    setPlanAdding(false);
    setPlanConflictDates(null);
  };

  // API処理中（レシピ提案・献立作成のみ。データ取得中はここに入らない）
  if (view === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 40 }}>
        <ActivityIndicator size="large" color="#d4725c" />
        <Text style={{ fontSize: 14, color: "#4a3f36", fontWeight: "600", marginTop: 16 }}>処理中...</Text>
      </View>
    );
  }

  // Suggest result
  if (view === "suggestResult" && suggestResult) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <TouchableOpacity style={s.formBackBtn} onPress={() => setView("list")}>
            <Text style={{ color: "#a08979", fontSize: 12 }}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#4a3f36" }}>レシピ提案結果</Text>
        </View>
        <View style={s.coopInfoBox}>
          <Text style={{ fontSize: 12, color: "#8a7e72" }}>使用食材: {suggestResult.ingredients_used.join("、")}</Text>
        </View>
        {suggestResult.recipes.map((r, idx) => {
          const key = `suggest-${idx}`;
          const saved = savedFlags[key];
          return (
            <View key={idx} style={[s.coopRecipeCard, { marginBottom: 10 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: 24 }}>{getEmoji(r.name)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#4a3f36" }}>{r.name}</Text>
                  <Text style={{ fontSize: 10, color: "#b8a594" }}>{r.time} · {r.difficulty} · {r.source === "ai_generate" ? "🤖 AI" : "🔍 Web"}</Text>
                </View>
              </View>
              <Text style={s.sectionLabel}>材料</Text>
              <View style={s.ingTagWrap}>
                {(r.ingredients || []).map((ing, i) => <View key={i} style={s.ingTag}><Text style={{ fontSize: 11, color: "#6a5d50" }}>{ing}</Text></View>)}
              </View>
              <Text style={s.sectionLabel}>作り方</Text>
              {(r.steps || []).map((step, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 3 }}>
                  <View style={s.stepNumSmall}><Text style={{ color: "#fff", fontSize: 9 }}>{i + 1}</Text></View>
                  <Text style={{ fontSize: 12, color: "#5a4a3c", flex: 1 }}>{step}</Text>
                </View>
              ))}
              <TouchableOpacity style={[s.saveBtn, { marginTop: 10, opacity: saved ? 0.6 : 1 }]}
                onPress={() => !saved && handleSaveRecipe(r, key)} disabled={saved}>
                <Text style={s.saveBtnText}>{saved ? "✓ 保存済み" : "📖 レシピに保存する"}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    );
  }

  // Plan result
  if (view === "planResult" && planResult) {
    const allSaved = planResult.plan.every(d => savedFlags[`plan-${d.day}`]);
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <TouchableOpacity style={s.formBackBtn} onPress={() => { setPlanConflictDates(null); setView("list"); }}>
            <Text style={{ color: "#a08979", fontSize: 12 }}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#4a3f36" }}>自動献立プラン</Text>
        </View>
        <TouchableOpacity style={[s.planAllBtn, { opacity: allSaved || planAdding ? 0.6 : 1 }]}
          onPress={handleStartAddAllPlans} disabled={allSaved || planAdding}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{allSaved ? "✓ すべて登録済み" : "📅 すべて献立に登録する"}</Text>
        </TouchableOpacity>
        {planConflictDates && (
          <View style={{ backgroundColor: "#fff5e9", borderWidth: 1, borderColor: "#e7c9a8", borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <Text style={{ color: "#5a4a3c", fontSize: 13, fontWeight: "700", marginBottom: 6 }}>既存の献立がある日があります</Text>
            <Text style={{ color: "#6a5d50", fontSize: 12, marginBottom: 8 }}>対象日: {planConflictDates.map(formatPlanDate).join("、")}</Text>
            <Text style={{ color: "#6a5d50", fontSize: 12, marginBottom: 12 }}>既存の献立は残し、提案料理を追加します。</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity style={[s.formBackBtn, { flex: 1, alignItems: "center" }]} onPress={() => setPlanConflictDates(null)} disabled={planAdding}>
                <Text style={{ color: "#a08979", fontSize: 12 }}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.planAllBtn, { flex: 1, marginBottom: 0, opacity: planAdding ? 0.6 : 1 }]} onPress={handleConfirmAddAllPlans} disabled={planAdding}>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>{planAdding ? "追加中..." : "追加する"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {planResult.plan.map((dayItem, idx) => {
          const saved = savedFlags[`plan-${dayItem.day}`];
          const r = dayItem.recipe;
          const dateKey = getPlanDateKey(idx);
          const pd = formatDate(new Date(`${dateKey}T00:00:00`));
          return (
            <View key={idx} style={[s.coopRecipeCard, { marginBottom: 10 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <View style={s.dayBadge}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>{dayItem.label}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 9 }}>{pd.month}/{pd.day}({pd.weekday})</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#4a3f36" }}>{r.name}</Text>
                  <Text style={{ fontSize: 10, color: "#b8a594" }}>{r.time} · {r.difficulty}</Text>
                </View>
              </View>
              <Text style={s.sectionLabel}>材料</Text>
              <View style={s.ingTagWrap}>
                {(r.ingredients || []).map((ing, i) => <View key={i} style={s.ingTag}><Text style={{ fontSize: 11, color: "#6a5d50" }}>{ing}</Text></View>)}
              </View>
              <Text style={s.sectionLabel}>作り方</Text>
              {(r.steps || []).map((step, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 3 }}>
                  <View style={s.stepNumSmall}><Text style={{ color: "#fff", fontSize: 9 }}>{i + 1}</Text></View>
                  <Text style={{ fontSize: 12, color: "#5a4a3c", flex: 1 }}>{step}</Text>
                </View>
              ))}
              <TouchableOpacity style={[s.planDayBtn, { marginTop: 10, opacity: saved ? 0.6 : 1 }]}
                onPress={() => !saved && handleAddToMealFromPlan(dayItem, dateKey)} disabled={saved}>
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 12 }}>
                  {saved ? `✓ ${pd.month}/${pd.day}に登録済み` : `📅 ${pd.month}/${pd.day}(${pd.weekday})の献立に登録`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    );
  }

  // Main list
  if (fetching && !coopData) {
    return <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator size="large" color="#d4725c" /></View>;
  }
  if (!coopData) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ justifyContent: "center", alignItems: "center", padding: 24, gap: 12 }}>
        {shortcutButtons}
        <Text style={{ fontSize: 40 }}>📦</Text>
        {error ? (
          <>
            <Text style={{ fontSize: 14, color: "#c0564e", textAlign: "center" }}>{error}</Text>
            <TouchableOpacity style={{ padding: 12, backgroundColor: "#a08979", borderRadius: 10, opacity: fetching ? 0.6 : 1 }} onPress={loadSavedIngredients} disabled={fetching}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>一覧を再読み込み</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 12, backgroundColor: "#d4725c", borderRadius: 10, opacity: fetching ? 0.6 : 1 }} onPress={refreshFromMail} disabled={fetching}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>メールを手動取得</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 14, color: "#b8a594", textAlign: "center" }}>注文データがありません</Text>
            <TouchableOpacity style={{ padding: 12, backgroundColor: "#a08979", borderRadius: 10, opacity: fetching ? 0.6 : 1 }} onPress={loadSavedIngredients} disabled={fetching}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>一覧を再読み込み</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 12, backgroundColor: "#d4725c", borderRadius: 10, opacity: fetching ? 0.6 : 1 }} onPress={refreshFromMail} disabled={fetching}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>メールを手動取得</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    );
  }

  const selectedNames = getSelectedNames();
  const totalItems = COOP_CATEGORIES.reduce((sum, cat) => sum + (coopData[cat.key] || []).length, 0);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 100 }}>
        <View style={s.coopOrderInfo}>
          <Text style={{ fontSize: 20 }}>📦</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#4a3f36" }}>注文日: {coopData.order_date}</Text>
            <Text style={{ fontSize: 11, color: "#b8a594" }}>合計 {totalItems} アイテム</Text>
          </View>
          <TouchableOpacity
            style={[s.refreshBtn, fetching && { opacity: 0.6 }]}
            onPress={refreshFromMail}
            disabled={fetching}
          >
            {fetching
              ? <ActivityIndicator size="small" color="#d4725c" />
              : <Text>🔄</Text>
            }
          </TouchableOpacity>
        </View>
        {shortcutButtons}
        {error && (
          <View style={{ padding: 10, backgroundColor: "#fdeeed", borderRadius: 10, marginBottom: 8, gap: 8 }}>
            <Text style={{ fontSize: 12, color: "#c0564e" }}>{error}</Text>
            <TouchableOpacity onPress={loadSavedIngredients} disabled={fetching} style={{ alignSelf: "flex-start", paddingVertical: 5, paddingHorizontal: 9, backgroundColor: "#a08979", borderRadius: 7 }}>
              <Text style={{ fontSize: 11, color: "#fff", fontWeight: "700" }}>一覧を再読み込み</Text>
            </TouchableOpacity>
          </View>
        )}

        {COOP_CATEGORIES.map(cat => {
          const items = coopData[cat.key] || [];
          if (items.length === 0) return null;
          const isExpanded = expandedCat.has(cat.key);
          const selCount = items.filter(i => selected.has(`${cat.key}:${i.order_no}`)).length;
          const allSel = selCount === items.length;
          return (
            <View key={cat.key} style={s.coopCatSection}>
              <TouchableOpacity style={s.coopCatHeader} onPress={() => toggleCategory(cat.key)}>
                <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
                <Text style={[s.coopCatLabel, { color: cat.color }]}>{cat.label}</Text>
                <Text style={{ fontSize: 11, color: "#b8a594" }}>{items.length}品</Text>
                {selCount > 0 && <View style={s.coopSelBadge}><Text style={{ fontSize: 10, color: "#d4725c" }}>{selCount}選択</Text></View>}
                <Text style={{ fontSize: 10, color: "#a09585", marginLeft: "auto" }}>{isExpanded ? "▾" : "▸"}</Text>
              </TouchableOpacity>
              {isExpanded && (
                <View>
                  <TouchableOpacity style={s.selectAllBtn} onPress={() => selectAllInCategory(cat.key)}>
                    <Text style={{ fontSize: 11, color: "#8a7e72" }}>{allSel ? "☑ すべて解除" : "☐ すべて選択"}</Text>
                  </TouchableOpacity>
                  {items.map(item => {
                    const itemKey = `${cat.key}:${item.order_no}`;
                    const isSel = selected.has(itemKey);
                    return (
                      <React.Fragment key={itemKey}>
                        <TouchableOpacity style={[s.coopItem, isSel && s.coopItemSel]} onPress={() => toggleSelect(itemKey)} onLongPress={() => openProductEditor(item, cat.label)} delayLongPress={450} disabled={fetching || classifying}>
                          <View style={[s.checkbox, isSel && s.checkboxChecked]}>
                            {isSel && <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text>}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: "500", color: isSel ? "#4a3f36" : "#6a5d50" }}>{item.name}</Text>
                            <Text style={{ fontSize: 10, color: "#b8a594" }}>{item.original_name}</Text>
                          </View>
                          <Text style={{ fontSize: 11, color: "#c9a88c" }}>×{item.quantity}</Text>
                          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${item.name}の分類を編集`} onPress={() => openProductEditor(item, cat.label)} disabled={fetching || classifying} style={{ marginLeft: 8, paddingVertical: 5, paddingHorizontal: 8, backgroundColor: "#f4ece4", borderRadius: 7 }}>
                            <Text style={{ fontSize: 10, color: "#8a6c55" }}>分類</Text>
                          </TouchableOpacity>
                        </TouchableOpacity>
                        {editingProduct?.item.order_no === item.order_no && editingProduct.item.original_name === item.original_name && (
                          <View style={{ padding: 12, backgroundColor: "#fffaf4", borderColor: "#e8d8c8", borderWidth: 1, borderRadius: 10, marginHorizontal: 4, marginBottom: 8 }}>
                            <Text style={{ fontSize: 12, fontWeight: "700", color: "#4a3f36" }}>商品カテゴリを変更</Text>
                            <Text style={{ fontSize: 11, color: "#6a5d50", marginTop: 5 }}>{item.original_name || "商品名がありません"}</Text>
                            <Text style={{ fontSize: 10, color: "#8a7e72", marginTop: 4 }}>この分類は同じ商品名に次回以降も適用されます。</Text>
                            {!item.original_name?.trim() && <Text style={{ fontSize: 11, color: "#c0564e", marginTop: 5 }}>商品名が空欄のため分類を保存できません。</Text>}
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                              {COOP_CATEGORIES.map(option => (
                                <TouchableOpacity key={option.key} onPress={() => setEditingCategory(option.label)} disabled={classifying} style={{ paddingVertical: 6, paddingHorizontal: 9, borderRadius: 7, backgroundColor: editingCategory === option.label ? option.color : "#f2ece5" }}>
                                  <Text style={{ fontSize: 10, color: editingCategory === option.label ? "#fff" : "#6a5d50" }}>{option.label}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                              <TouchableOpacity onPress={() => setEditingProduct(null)} disabled={classifying} style={{ paddingVertical: 7, paddingHorizontal: 12 }}><Text style={{ fontSize: 11, color: "#8a7e72" }}>キャンセル</Text></TouchableOpacity>
                              <TouchableOpacity onPress={() => void saveProductCategory()} disabled={classifying || fetching || !item.original_name?.trim() || editingCategory === editingProduct.category} style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 7, backgroundColor: classifying || fetching || !item.original_name?.trim() || editingCategory === editingProduct.category ? "#c9bdb2" : "#d4725c" }}>
                                <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>{classifying ? "保存中..." : "保存"}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </React.Fragment>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {selectedNames.length > 0 && (
        <View style={s.coopActionBar}>
          <Text style={{ fontSize: 12, color: "#8a7e72", marginBottom: 8 }}>{selectedNames.length} 食材を選択中</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
            <TouchableOpacity style={[s.coopActionBtn, { flex: 1 }]} onPress={handleSuggest}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>🍽 レシピを提案</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.planAllBtn, { flex: 1 }]} onPress={handlePlan}>
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 12 }}>📅 献立を自動作成</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.googleBtn}
            onPress={() => Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(selectedNames.join(" ") + " レシピ")}`)}>
            <Text style={{ color: "#4a7ab5", fontWeight: "600", fontSize: 12 }}>🔍 Googleでレシピを検索</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

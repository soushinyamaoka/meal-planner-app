import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  StyleSheet, SafeAreaView, ActivityIndicator, Linking, Animated,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { StatusBar } from "expo-status-bar";

import { getDateKey, getDayLabel, formatDate, genFutureDates, genArchiveDates, getEmoji, genId, getGreeting } from "./src/utils/helpers";
import { searchRecipeFromWeb, fetchCoopIngredients, triggerCoopFetch, suggestCoopRecipes, createCoopMealPlan, fetchRecipeTitle, extractRecipe } from "./src/api";
import { COOP_CATEGORIES } from "./src/data/sampleData";
import { Recipe, RecipeFormData, MenuItem, Menus, CoopData, CoopCategoryKey, SuggestResult, SuggestRecipe, PlanResult, PlanDayItem, ModalState, WebSearchItem, RecipeCategory } from "./src/types";
import { useAuth } from "./src/hooks/useAuth";
import { useHousehold } from "./src/hooks/useHousehold";
import { useFirestore } from "./src/hooks/useFirestore";
import LoginScreen from "./src/screens/LoginScreen";
import { HouseholdSetupScreen, HouseholdSettingsPanel, ApiSettingsPanel } from "./src/screens/HouseholdScreen";

// ═══════════════════════════════════════════
// Main App
// ═══════════════════════════════════════════
export default function App() {
  const { user, loading: authLoading, authLoading: signingIn, error: authError, setError: clearAuthError, signIn, signUp, resetPassword, logout } = useAuth();
  const { household, loadingHousehold, pendingInvite, loadError: householdError, createHousehold, joinHousehold, declineInvite, inviteByEmail } = useHousehold(user);
  const { menus, setMenus, recipes, setRecipes, categories, setCategories, loadingData, loadError: dataError } = useFirestore(household?.id ?? null);

  const [tab, setTab] = useState<"meals" | "recipes" | "coop" | "settings">("meals");
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | "new" | "websearch" | null>(null);
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);
  const [addToMealRecipe, setAddToMealRecipe] = useState<Recipe | null>(null);

  // ─── 初期化エラー ─────────────────────────────────────────────────────────────
  const fatalError = householdError || dataError;
  if (fatalError && user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#faf5ef", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <StatusBar style="dark" />
        <Text style={{ fontSize: 32, marginBottom: 12 }}>⚠️</Text>
        <Text style={{ color: "#c0564e", fontSize: 14, textAlign: "center", marginBottom: 8 }}>{fatalError}</Text>
        <Text style={{ color: "#a08979", fontSize: 12, textAlign: "center", marginBottom: 20 }}>
          通信状態を確認のうえ、アプリを再起動してください
        </Text>
        <TouchableOpacity
          style={{ paddingVertical: 10, paddingHorizontal: 20, backgroundColor: "#f5ebe2", borderRadius: 10 }}
          onPress={logout}
        >
          <Text style={{ color: "#8a7e72", fontSize: 13 }}>ログアウト</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── 読み込み中 ───────────────────────────────────────────────────────────────
  if (authLoading || loadingHousehold || (household && loadingData)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#faf5ef", alignItems: "center", justifyContent: "center" }}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#d4725c" />
        <Text style={{ color: "#a08979", marginTop: 12, fontSize: 14 }}>読み込み中...</Text>
      </SafeAreaView>
    );
  }

  // ─── 未ログイン ───────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <LoginScreen
        onSignIn={signIn}
        onSignUp={signUp}
        onResetPassword={resetPassword}
        authLoading={signingIn}
        error={authError}
        onClearError={() => clearAuthError(null)}
      />
    );
  }

  // ─── グループ未所属 ────────────────────────────────────────────────────────────
  if (!household) {
    return (
      <HouseholdSetupScreen
        user={user}
        pendingInvite={pendingInvite}
        onCreateHousehold={createHousehold}
        onJoinHousehold={joinHousehold}
        onDeclineInvite={declineInvite}
        onLogout={logout}
      />
    );
  }

  // ─── ハンドラー ───────────────────────────────────────────────────────────────
  const handleChipTap = (dateKey: string, index: number, item: MenuItem): void => {
    if (item.recipeId) {
      const recipe = recipes.find(r => r.id === item.recipeId);
      if (recipe) { setModalState({ mode: "view", recipe, menuRef: { dateKey, index } }); return; }
    }
    // recipeIdがない場合はメニュー名でレシピを検索（献立専用レシピは除外）
    const recipeByName = recipes.find(r => r.name === item.name && r.showInList !== false);
    if (recipeByName) { setModalState({ mode: "view", recipe: recipeByName, menuRef: { dateKey, index } }); return; }
    setModalState({ mode: "unlinked", prefillName: item.name, menuRef: { dateKey, index } });
  };

  const handleModalSaveRecipe = (savedRecipe: RecipeFormData): void => {
    const id = savedRecipe.id ?? genId();
    const full: Recipe = { ...savedRecipe, id };
    if (!savedRecipe.id) setRecipes(p => [...p, full]);
    else setRecipes(p => p.map(r => r.id === id ? full : r));
    if (modalState?.menuRef) {
      const { dateKey, index } = modalState.menuRef;
      setMenus(p => {
        const items = [...(p[dateKey] || [])];
        if (items[index]) items[index] = { ...items[index], id: items[index].id ?? genId(), name: full.name, recipeId: id };
        return { ...p, [dateKey]: items };
      });
    }
    setModalState({ mode: "view", recipe: full, menuRef: modalState?.menuRef });
  };

  const handlePromoteRecipe = (): void => {
    if (!modalState?.recipe) return;
    const updated: Recipe = { ...modalState.recipe, showInList: true };
    setRecipes(p => p.map(r => r.id === updated.id ? updated : r));
    setModalState({ ...modalState, recipe: updated });
  };

  const handleModalDeleteMenu = (): void => {
    if (!modalState?.menuRef) return;
    const { dateKey, index } = modalState.menuRef;
    setMenus(p => {
      const items = [...(p[dateKey] || [])]; items.splice(index, 1);
      const n = { ...p };
      if (items.length === 0) delete n[dateKey]; else n[dateKey] = items;
      return n;
    });
    setModalState(null);
  };

  const handleAddRecipeToMeal = (recipe: Recipe, dateKey: string): void => {
    setMenus(p => ({ ...p, [dateKey]: [...(p[dateKey] || []), { id: genId(), name: recipe.name, recipeId: recipe.id }] }));
    setAddToMealRecipe(null); setViewRecipe(null);
  };

  const handleSaveForMeal = (savedRecipe: RecipeFormData, dateKey: string, saveAsRecipe: boolean): void => {
    const id = genId();
    const full: Recipe = saveAsRecipe
      ? { ...savedRecipe, id }
      : { ...savedRecipe, id, showInList: false };
    setRecipes(p => [...p, full]);
    setMenus(p => ({ ...p, [dateKey]: [...(p[dateKey] || []), { id: genId(), name: full.name, recipeId: id }] }));
    setModalState(null);
  };

  const clearModals = (): void => { setModalState(null); setEditingRecipe(null); setViewRecipe(null); setAddToMealRecipe(null); };
  const greeting = getGreeting();

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerIcon}>🍽️</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>献立ノート</Text>
          <Text style={s.subtitle}>毎日のごはんを、たのしく記録</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={s.headerGreeting} numberOfLines={1}>{greeting.text} {greeting.emoji}</Text>
          <Text style={s.headerHouse} numberOfLines={1}>{household.name}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {[
          { key: "meals", icon: "📅", label: "献立" },
          { key: "recipes", icon: "📖", label: "レシピ" },
          { key: "coop", icon: "🛒", label: "COOP" },
          { key: "settings", icon: "👥", label: "設定" },
        ].map(t => (
          <TouchableOpacity key={t.key} style={[s.tabBtn, tab === t.key && s.tabActive]}
            activeOpacity={0.7}
            onPress={() => { setTab(t.key as "meals" | "recipes" | "coop" | "settings"); clearModals(); }}>
            <Text style={[s.tabIcon, tab === t.key && s.tabIconActive]}>{t.icon}</Text>
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {tab === "meals" && (
        <MealsTab menus={menus} setMenus={setMenus} recipes={recipes}
          onChipTap={handleChipTap}
          onManualAdd={(dateKey) => setModalState({ mode: "create-for-meal", dateKey, prefillName: "" })} />
      )}
      {tab === "recipes" && (
        <RecipesTab recipes={recipes} setRecipes={setRecipes}
          onViewRecipe={setViewRecipe} editingRecipe={editingRecipe}
          setEditingRecipe={setEditingRecipe} onAddToMeal={setAddToMealRecipe}
          categories={categories} setCategories={setCategories} />
      )}
      {/* CoopTabはタブ切替時もマウント維持（提案結果のsavedFlags等を保持） */}
      <View style={{ flex: 1, display: tab === "coop" ? "flex" : "none" }}>
        <CoopTab recipes={recipes} setRecipes={setRecipes} menus={menus} setMenus={setMenus} />
      </View>
      {tab === "settings" && (
        <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} enableOnAndroid extraScrollHeight={16}>
          <HouseholdSettingsPanel
            household={household}
            user={user}
            pendingInvite={pendingInvite}
            onInvite={inviteByEmail}
            onJoinHousehold={joinHousehold}
            onDeclineInvite={declineInvite}
            onLogout={logout}
          >
            <ApiSettingsPanel />
          </HouseholdSettingsPanel>
        </KeyboardAwareScrollView>
      )}

      {/* Modals */}
      {modalState && (
        <RecipeModal state={modalState} onClose={() => setModalState(null)}
          onSave={handleModalSaveRecipe} onSaveForMeal={handleSaveForMeal}
          onEdit={() => setModalState({ ...modalState, mode: "edit" })}
          onCreateRecipe={() => setModalState({ ...modalState, mode: "create" })}
          onPromote={handlePromoteRecipe}
          onDeleteMenu={handleModalDeleteMenu}
          onWebSearch={() => setModalState({ ...modalState, mode: "search" })} />
      )}
      {viewRecipe && (
        <RecipeViewModal recipe={viewRecipe} onClose={() => setViewRecipe(null)}
          onAddToMeal={() => setAddToMealRecipe(viewRecipe)} />
      )}
      {addToMealRecipe && (
        <DatePickerModal recipe={addToMealRecipe} menus={menus}
          onSelect={(dk) => handleAddRecipeToMeal(addToMealRecipe, dk)}
          onClose={() => setAddToMealRecipe(null)} />
      )}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════
// Meals Tab
// ═══════════════════════════════════════════
type MealsTabProps = {
  menus: Menus;
  setMenus: React.Dispatch<React.SetStateAction<Menus>>;
  recipes: Recipe[];
  onChipTap: (dateKey: string, index: number, item: MenuItem) => void;
  onManualAdd: (dateKey: string) => void;
};

function MealsTab({ menus, setMenus, recipes, onChipTap, onManualAdd }: MealsTabProps) {
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<"recipe" | null>(null);
  const [archiveOpen, setArchiveOpen] = useState<boolean>(false);
  const [swapSourceDate, setSwapSourceDate] = useState<string | null>(null);
  const [moveItem, setMoveItem] = useState<{ dateKey: string; index: number; item: MenuItem } | null>(null);
  const futureDates = genFutureDates();
  const archiveDates = genArchiveDates();
  const todayKey = getDateKey(new Date());
  const futureDateKeys = futureDates.map(d => getDateKey(d));
  const hasUpcomingMeal = futureDates.slice(1).some(d => (menus[getDateKey(d)] || []).length > 0);

  const flashAnims = useRef<Record<string, Animated.Value>>({});
  const getFlashAnim = (key: string): Animated.Value => {
    if (!flashAnims.current[key]) flashAnims.current[key] = new Animated.Value(0);
    return flashAnims.current[key];
  };
  const triggerFlash = (keys: string[]): void => {
    keys.forEach(k => getFlashAnim(k).setValue(0));
    Animated.parallel(
      keys.map(k =>
        Animated.sequence([
          Animated.timing(getFlashAnim(k), { toValue: 0.4, duration: 150, useNativeDriver: true }),
          Animated.timing(getFlashAnim(k), { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      )
    ).start();
  };

  const handleAddClick = (dateKey: string): void => { setAddingDate(dateKey); setAddMode(null); };
  const handleManualInput = (): void => { if (addingDate) { onManualAdd(addingDate); setAddingDate(null); setAddMode(null); } };
  const handlePickRecipe = (recipe: Recipe): void => {
    if (!addingDate) return;
    setMenus(p => ({ ...p, [addingDate]: [...(p[addingDate] || []), { id: genId(), name: recipe.name, recipeId: recipe.id }] }));
    setAddingDate(null); setAddMode(null);
  };
  const handleCancel = (): void => { setAddingDate(null); setAddMode(null); };
  const archiveHasData = archiveDates.some(d => menus[getDateKey(d)]?.length > 0);

  // 日にち長押し → swap選択 / swap実行
  const handleDateLongPress = (key: string): void => {
    if (addingDate) return;
    setSwapSourceDate(key);
  };
  const handleDatePressForSwap = (key: string): void => {
    if (!swapSourceDate) return;
    if (swapSourceDate === key) { setSwapSourceDate(null); return; }
    const src = swapSourceDate;
    setMenus(p => ({
      ...p,
      [src]: p[key] || [],
      [key]: p[src] || [],
    }));
    setSwapSourceDate(null);
    triggerFlash([src, key]);
  };

  // レシピ長押し → 移動先選択
  const handleChipLongPress = (dateKey: string, index: number, item: MenuItem): void => {
    if (addingDate) return;
    setMoveItem({ dateKey, index, item });
  };
  const handleMoveItem = (targetKey: string): void => {
    if (!moveItem) return;
    const { dateKey, index, item } = moveItem;
    if (dateKey === targetKey) { setMoveItem(null); return; }
    setMenus(p => {
      const sourceItems = [...(p[dateKey] || [])];
      sourceItems.splice(index, 1);
      const targetItems = [...(p[targetKey] || []), item];
      const n = { ...p, [targetKey]: targetItems };
      if (sourceItems.length === 0) delete n[dateKey]; else n[dateKey] = sourceItems;
      return n;
    });
    setMoveItem(null);
    triggerFlash([targetKey]);
  };

  // 追加フロー（手入力 / レシピから）。ヒーローカードと通常カードで共通利用
  const renderAddFlow = () => {
    // 献立専用レシピ（showInList === false）は候補に出さない
    const pickableRecipes = recipes.filter(r => r.showInList !== false);
    return (
    <View>
      {!addMode && (
        <View style={s.addModeSelect}>
          <TouchableOpacity style={s.modeBtn} onPress={handleManualInput}>
            <Text>✏️ 手入力</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.modeBtn} onPress={() => setAddMode("recipe")}>
            <Text>📖 レシピから</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.modeCancelBtn} onPress={handleCancel}>
            <Text style={{ color: "#a08979", fontSize: 16 }}>×</Text>
          </TouchableOpacity>
        </View>
      )}
      {addMode === "recipe" && (
        <View>
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#8a7e72", marginBottom: 6 }}>レシピを選択</Text>
          {pickableRecipes.length === 0 && <Text style={{ fontSize: 12, color: "#c9a88c", fontStyle: "italic" }}>レシピがまだありません</Text>}
          {pickableRecipes.map(r => (
            <TouchableOpacity key={r.id} style={s.recipePickerItem} onPress={() => handlePickRecipe(r)}>
              <Text>{getEmoji(r.name)} {r.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[s.cancelBtn, { marginTop: 4 }]} onPress={handleCancel}>
            <Text style={s.cancelBtnText}>やめる</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
    );
  };

  // 「今日のごはん」ヒーローカード（献立リスト最上部）
  const renderHeroCard = (date: Date) => {
    const key = getDateKey(date);
    const { month, day, weekday } = formatDate(date);
    const items = menus[key] || [];
    const isAddingToday = addingDate === key;
    const isSwapSource = swapSourceDate === key;
    const isSwapTarget = swapSourceDate !== null && swapSourceDate !== key;

    return (
      <View style={[s.hero, isSwapSource && s.heroSwapActive, isSwapTarget && s.heroSwapActive]}>
        <View style={s.heroRow}>
          <Text style={s.heroTag}>🍳 今日のごはん</Text>
          <TouchableOpacity
            style={s.heroDate}
            activeOpacity={isSwapTarget ? 0.6 : 1}
            onLongPress={() => handleDateLongPress(key)}
            onPress={() => isSwapTarget && handleDatePressForSwap(key)}
            delayLongPress={400}>
            <Text style={s.heroDateText}>{isSwapSource ? "選択中" : `${month}/${day} (${weekday})`}</Text>
          </TouchableOpacity>
        </View>

        {items.length > 0 && (
          <View style={s.heroMeals}>
            {items.map((item, i) => (
              <TouchableOpacity key={item.id ?? `${i}-${item.recipeId ?? ''}-${item.name}`}
                onPress={() => { if (swapSourceDate) { handleDatePressForSwap(key); } else { onChipTap(key, i, item); } }}
                onLongPress={() => handleChipLongPress(key, i, item)}
                delayLongPress={400}
                style={s.heroMeal}>
                <Text style={{ fontSize: 26 }}>{getEmoji(item.name)}</Text>
                <Text style={s.heroMealName}>{item.name}</Text>
                {item.recipeId && recipes.find(r => r.id === item.recipeId)?.showInList !== false && <Text style={{ fontSize: 12, opacity: 0.55 }}>📖</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {items.length === 0 && !isAddingToday && !swapSourceDate && (
          <Text style={s.heroEmpty}>今日の献立はまだ決まっていません</Text>
        )}

        {isSwapTarget ? (
          <TouchableOpacity style={s.heroSwapHint} onPress={() => handleDatePressForSwap(key)}>
            <Text style={{ fontSize: 12, color: "#5a8a4a", fontWeight: "700" }}>↔ ここに入れ替える</Text>
          </TouchableOpacity>
        ) : isSwapSource ? (
          <TouchableOpacity style={s.heroCancelSwap} onPress={() => setSwapSourceDate(null)}>
            <Text style={{ fontSize: 12, color: "#a08979" }}>入れ替えをやめる</Text>
          </TouchableOpacity>
        ) : isAddingToday ? (
          <View style={{ marginTop: 2 }}>{renderAddFlow()}</View>
        ) : (
          <TouchableOpacity style={s.heroAdd} onPress={() => handleAddClick(key)}>
            <Text style={s.heroAddText}>＋ メニューを追加</Text>
          </TouchableOpacity>
        )}

        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#5a8a4a", borderRadius: 22, opacity: getFlashAnim(key) }]} />
      </View>
    );
  };

  const renderCard = (date: Date, idx: number, isArchive = false) => {
    const key = getDateKey(date);
    const { month, day, weekday } = formatDate(date);
    const label = getDayLabel(date);
    const isToday = key === todayKey;
    const items = menus[key] || [];
    const isAdding = addingDate === key;
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isSwapSource = swapSourceDate === key;
    const isSwapTarget = swapSourceDate !== null && swapSourceDate !== key && !isArchive;

    return (
      <View key={key} style={[s.card, isToday && s.cardToday, isArchive && s.cardArchive, isSwapSource && s.cardSwapSource]}>
        <TouchableOpacity
          style={[s.dateSection, isToday && s.dateSectionToday, isArchive && s.dateSectionArchive, isSwapTarget && s.dateSectionSwapTarget]}
          activeOpacity={isSwapTarget ? 0.6 : 1}
          onLongPress={() => !isArchive && handleDateLongPress(key)}
          onPress={() => isSwapTarget && handleDatePressForSwap(key)}
          delayLongPress={400}>
          {isSwapSource
            ? <Text style={{ fontSize: 9, color: "#fff", fontWeight: "700", marginBottom: 2 }}>選択中</Text>
            : label && <Text style={[s.dayLabel, isToday && s.dayLabelToday, isArchive && { color: "#b8a594" }]}>{label}</Text>
          }
          <Text style={[s.dateNum, isToday && s.dateNumToday, isSwapSource && { color: "#fff" }, isArchive && { color: "#9e9589", fontSize: 22 }]}>{day}</Text>
          <Text style={{ fontSize: 10, color: isSwapSource ? "rgba(255,255,255,0.85)" : isWeekend ? (date.getDay() === 0 ? "#d4725c" : "#7a9ec4") : isToday ? "rgba(255,255,255,0.75)" : isArchive ? "#c4bbb0" : "#b8a594" }}>
            {month}月 ({weekday})
          </Text>
        </TouchableOpacity>
        <View style={s.menuSection}>
          {items.length > 0 && (
            <View style={s.chipWrap}>
              {items.map((item, i) => (
                <TouchableOpacity key={item.id ?? `${i}-${item.recipeId ?? ''}-${item.name}`}
                  onPress={() => { if (swapSourceDate) { handleDatePressForSwap(key); } else { onChipTap(key, i, item); } }}
                  onLongPress={() => !isArchive && handleChipLongPress(key, i, item)}
                  delayLongPress={400}
                  style={[s.chip, isArchive && s.chipArchive]}>
                  <Text style={{ fontSize: 14 }}>{getEmoji(item.name)}</Text>
                  <Text style={[s.chipText, isArchive && { color: "#8a8079" }]}>{item.name}</Text>
                  {item.recipeId && recipes.find(r => r.id === item.recipeId)?.showInList !== false && <Text style={{ fontSize: 10, opacity: 0.6 }}>📖</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
          {isAdding ? renderAddFlow() : (
            !isArchive && !swapSourceDate && (
              <TouchableOpacity style={[s.addBtn, items.length === 0 && s.addBtnEmpty]} onPress={() => handleAddClick(key)}>
                <Text style={{ fontSize: 15, color: "#c9a88c" }}>+ </Text>
                <Text style={{ fontSize: 12, color: "#c9a88c" }}>{items.length === 0 ? "メニューを追加" : "追加"}</Text>
              </TouchableOpacity>
            )
          )}
          {isArchive && items.length === 0 && <Text style={{ fontSize: 12, color: "#c4bbb0", fontStyle: "italic" }}>記録なし</Text>}
        </View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#5a8a4a", borderRadius: 16, opacity: getFlashAnim(key) }]} />
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {swapSourceDate && (
        <View style={s.swapBanner}>
          <Text style={{ fontSize: 12, color: "#fff", flex: 1 }}>入れ替え先の日付をタップしてください</Text>
          <TouchableOpacity onPress={() => setSwapSourceDate(null)}>
            <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>キャンセル</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        {renderHeroCard(futureDates[0])}

        <View style={s.nbDivider}>
          <View style={s.nbDividerLine} />
          <Text style={s.nbDividerLabel}>これからの献立</Text>
          <View style={s.nbDividerLine} />
        </View>

        {!hasUpcomingMeal && !swapSourceDate && (
          <View style={s.mealsEmptyHint}>
            <Text style={{ fontSize: 28 }}>🗓️</Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#6a5d50", marginTop: 6 }}>これからの献立を登録しましょう</Text>
            <Text style={{ fontSize: 12, color: "#a09585", marginTop: 4, textAlign: "center", lineHeight: 18 }}>
              各日付の「＋ メニューを追加」から、{"\n"}手入力 または 保存したレシピで登録できます
            </Text>
          </View>
        )}

        <View style={s.nlist}>
          <View style={s.nlistBindLine} pointerEvents="none" />
          {futureDates.slice(1).map((d, i) => renderCard(d, i + 1))}
        </View>

        <View style={{ marginTop: 20 }}>
          <TouchableOpacity style={s.archiveToggle} onPress={() => setArchiveOpen(!archiveOpen)}>
            <Text style={{ fontSize: 12, color: "#a09585" }}>{archiveOpen ? "▾" : "▸"}</Text>
            <Text style={{ fontSize: 13, fontWeight: "500", color: "#8a7e72" }}> アーカイブ（過去7日間）</Text>
            {!archiveOpen && archiveHasData && (
              <View style={s.archiveBadge}><Text style={{ fontSize: 10, color: "#c9a88c" }}>記録あり</Text></View>
            )}
          </TouchableOpacity>
          {archiveOpen && archiveDates.map((d, i) => renderCard(d, i, true))}
        </View>
      </ScrollView>
      {moveItem && (
        <MoveDatePickerModal
          item={moveItem.item}
          sourceKey={moveItem.dateKey}
          futureDateKeys={futureDateKeys}
          menus={menus}
          onSelect={handleMoveItem}
          onClose={() => setMoveItem(null)} />
      )}
    </View>
  );
}

// ═══════════════════════════════════════════
// Recipes Tab
// ═══════════════════════════════════════════
type RecipesTabProps = {
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  onViewRecipe: (recipe: Recipe) => void;
  editingRecipe: Recipe | "new" | "websearch" | null;
  setEditingRecipe: React.Dispatch<React.SetStateAction<Recipe | "new" | "websearch" | null>>;
  onAddToMeal: (recipe: Recipe) => void;
  categories: RecipeCategory[];
  setCategories: React.Dispatch<React.SetStateAction<RecipeCategory[]>>;
};

function RecipesTab({ recipes, setRecipes, onViewRecipe, editingRecipe, setEditingRecipe, onAddToMeal, categories, setCategories }: RecipesTabProps) {
  const [filterCatId, setFilterCatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const listedRecipes = recipes.filter(r => r.showInList !== false);
  const q = searchQuery.trim().toLowerCase();
  const filteredRecipes = (filterCatId
    ? listedRecipes.filter(r => r.categoryIds?.includes(filterCatId))
    : listedRecipes
  ).filter(r => q === "" || r.name.toLowerCase().includes(q));

  if (editingRecipe === "websearch") {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
        <View style={s.formCard}>
          <WebSearchRecipe onCancel={() => setEditingRecipe(null)} />
        </View>
      </ScrollView>
    );
  }

  if (editingRecipe) {
    return (
      <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }} enableOnAndroid extraScrollHeight={16}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <TouchableOpacity style={s.formBackBtn} onPress={() => setEditingRecipe(null)}>
            <Text style={{ color: "#a08979", fontSize: 12 }}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#4a3f36" }}>{editingRecipe === "new" ? "新しいレシピ" : "レシピ編集"}</Text>
        </View>
        <View style={s.formCard}>
          <RecipeFormFull recipe={editingRecipe === "new" ? null : editingRecipe}
            categories={categories}
            setCategories={setCategories}
            setRecipes={setRecipes}
            onSave={(r) => {
              if (editingRecipe === "new") setRecipes(p => [...p, { ...r, id: genId() } as Recipe]);
              else setRecipes(p => p.map(x => x.id === r.id ? { ...r, id: r.id! } as Recipe : x));
              setEditingRecipe(null);
            }}
            onCancel={() => setEditingRecipe(null)}
            onDelete={editingRecipe !== "new" ? (id) => { setRecipes(p => p.filter(x => x.id !== id)); setEditingRecipe(null); } : null} />
        </View>
      </KeyboardAwareScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
      <TouchableOpacity style={s.newRecipeBtn} onPress={() => setEditingRecipe("new")}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#d4725c" }}>+ 新しいレシピを追加</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.webSearchBtn} onPress={() => setEditingRecipe("websearch")}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>🔍 WEB検索でレシピ作成</Text>
      </TouchableOpacity>

      {/* レシピ名検索 */}
      {listedRecipes.length > 0 && (
        <View style={s.recipeSearchBox}>
          <Text style={{ fontSize: 14 }}>🔍</Text>
          <TextInput
            style={s.recipeSearchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="レシピ名で検索"
            placeholderTextColor="#c9a88c"
            returnKeyType="search"
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 16, color: "#b8a594" }}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* カテゴリフィルター */}
      {categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
          <TouchableOpacity
            style={[s.filterChip, filterCatId === null && s.filterChipActive]}
            onPress={() => setFilterCatId(null)}>
            <Text style={[s.filterChipText, filterCatId === null && s.filterChipTextActive]}>すべて</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity key={cat.id}
              style={[s.filterChip, filterCatId === cat.id && s.filterChipActive]}
              onPress={() => setFilterCatId(p => p === cat.id ? null : cat.id)}>
              <Text style={[s.filterChipText, filterCatId === cat.id && s.filterChipTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {filteredRecipes.length === 0 && (
        <View style={{ alignItems: "center", padding: 40 }}>
          <Text style={{ fontSize: 40 }}>{q !== "" ? "🔍" : "📖"}</Text>
          <Text style={{ color: "#b8a594", fontSize: 14, marginTop: 8 }}>
            {q !== "" ? `「${searchQuery.trim()}」に一致するレシピはありません`
              : filterCatId ? "このカテゴリのレシピはありません" : "レシピはまだありません"}
          </Text>
        </View>
      )}
      {filteredRecipes.map((r) => {
        const catNames = (r.categoryIds || [])
          .map(cid => categories.find(c => c.id === cid)?.name)
          .filter(Boolean) as string[];
        return (
          <TouchableOpacity key={r.id} style={s.recipeCard} onPress={() => onViewRecipe(r)}>
            <View style={s.recipeCardLeft}><Text style={{ fontSize: 28 }}>{getEmoji(r.name)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#4a3f36" }}>{r.name}</Text>
              <Text style={{ fontSize: 11, color: "#b8a594" }}>🥕 {r.ingredients.length}品  👨‍🍳 {r.steps.length}ステップ</Text>
              {catNames.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {catNames.map(name => (
                    <View key={name} style={s.catLabel}>
                      <Text style={s.catLabelText}>{name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <View style={{ gap: 4 }}>
              <TouchableOpacity style={s.recipeAddMealBtn} onPress={() => onAddToMeal(r)}>
                <Text style={{ fontSize: 10, fontWeight: "600", color: "#fff" }}>📅 献立に追加</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.recipeEditBtn} onPress={() => setEditingRecipe(r)}>
                <Text style={{ fontSize: 10, color: "#a08979" }}>編集</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════
// COOP Tab
// ═══════════════════════════════════════════
type CoopTabProps = {
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  menus: Menus;
  setMenus: React.Dispatch<React.SetStateAction<Menus>>;
};

function CoopTab({ recipes, setRecipes, menus, setMenus }: CoopTabProps) {
  const [coopData, setCoopData] = useState<CoopData | null>(null);
  const [fetching, setFetching] = useState<boolean>(false); // データ取得中フラグ
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedCat, setExpandedCat] = useState<Set<string>>(new Set(["ingredients", "kits"]));
  const [view, setView] = useState<"list" | "loading" | "suggestResult" | "planResult">("list");
  const [suggestResult, setSuggestResult] = useState<SuggestResult | null>(null);
  const [planResult, setPlanResult] = useState<PlanResult | null>(null);
  const [savedFlags, setSavedFlags] = useState<Record<string, boolean>>({});

  const loadData = async (): Promise<void> => {
    setFetching(true); setError(null);
    try {
      // 1. VPSにメール取得を指示
      const fetchResult = await triggerCoopFetch(14);
      if (fetchResult.status === "no_data") {
        setError("新しい注文データが見つかりませんでした");
        // no_dataでも既存データは表示し続ける
        if (!coopData) {
          // 初回取得時でno_dataの場合は既存データを試みる
          try {
            const data = await fetchCoopIngredients();
            setCoopData(data);
          } catch { /* 既存データもなければ空のまま */ }
        }
        return;
      }
      // 2. 取得成功後に最新データを取得
      const data = await fetchCoopIngredients();
      setCoopData(data);
      setSelected(new Set());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[COOP] failed:", msg);
      setError("取得に失敗しました: " + msg);
    } finally {
      setFetching(false);
    }
  };
  useEffect(() => { loadData(); }, []);

  const toggleSelect = (k: string): void => {
    setSelected(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
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

  const handleSuggest = async (): Promise<void> => {
    const names = getSelectedNames(); if (names.length === 0) return;
    setView("loading"); setSuggestResult(null); setSavedFlags({});
    try { const r = await suggestCoopRecipes(names); setSuggestResult(r); setView("suggestResult"); }
    catch { setError("レシピ提案に失敗しました"); setView("list"); }
  };
  const handlePlan = async (): Promise<void> => {
    const names = getSelectedNames(); if (names.length === 0) return;
    setView("loading"); setPlanResult(null); setSavedFlags({});
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
  const handleAddToMealFromPlan = (dayItem: PlanDayItem, idx: number): void => {
    const d = new Date(); d.setDate(d.getDate() + idx);
    const dateKey = getDateKey(d);
    const recipeId = genId();
    const r = dayItem.recipe;
    const url = dayItem.web_recipe?.url;
    const base = { id: recipeId, name: r.name, ingredients: r.ingredients || [], steps: r.steps || [] };
    const recipe: Recipe = url ? { ...base, url } : base;
    setRecipes(p => [...p, recipe]);
    setMenus(p => ({ ...p, [dateKey]: [...(p[dateKey] || []), { id: genId(), name: r.name, recipeId }] }));
    setSavedFlags(p => ({ ...p, [`plan-${dayItem.day}`]: true }));
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
          <TouchableOpacity style={s.formBackBtn} onPress={() => setView("list")}>
            <Text style={{ color: "#a08979", fontSize: 12 }}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#4a3f36" }}>自動献立プラン</Text>
        </View>
        <TouchableOpacity style={[s.planAllBtn, { opacity: allSaved ? 0.6 : 1 }]}
          onPress={() => !allSaved && planResult.plan.forEach((d, i) => !savedFlags[`plan-${d.day}`] && handleAddToMealFromPlan(d, i))} disabled={allSaved}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{allSaved ? "✓ すべて登録済み" : "📅 すべて献立に登録する"}</Text>
        </TouchableOpacity>
        {planResult.plan.map((dayItem, idx) => {
          const saved = savedFlags[`plan-${dayItem.day}`];
          const r = dayItem.recipe;
          const pd = formatDate((() => { const x = new Date(); x.setDate(x.getDate() + idx); return x; })());
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
                onPress={() => !saved && handleAddToMealFromPlan(dayItem, idx)} disabled={saved}>
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 12 }}>
        <Text style={{ fontSize: 40 }}>📦</Text>
        {error ? (
          <>
            <Text style={{ fontSize: 14, color: "#c0564e", textAlign: "center" }}>{error}</Text>
            <TouchableOpacity style={{ padding: 12, backgroundColor: "#d4725c", borderRadius: 10 }} onPress={loadData}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>再試行</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={{ fontSize: 14, color: "#b8a594", textAlign: "center" }}>注文データがありません</Text>
        )}
      </View>
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
            onPress={loadData}
            disabled={fetching}
          >
            {fetching
              ? <ActivityIndicator size="small" color="#d4725c" />
              : <Text>🔄</Text>
            }
          </TouchableOpacity>
        </View>
        {error && (
          <View style={{ padding: 10, backgroundColor: "#fdeeed", borderRadius: 10, marginBottom: 8 }}>
            <Text style={{ fontSize: 12, color: "#c0564e" }}>{error}</Text>
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
                      <TouchableOpacity key={itemKey} style={[s.coopItem, isSel && s.coopItemSel]} onPress={() => toggleSelect(itemKey)}>
                        <View style={[s.checkbox, isSel && s.checkboxChecked]}>
                          {isSel && <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text>}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "500", color: isSel ? "#4a3f36" : "#6a5d50" }}>{item.name}</Text>
                          <Text style={{ fontSize: 10, color: "#b8a594" }}>{item.original_name}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: "#c9a88c" }}>×{item.quantity}</Text>
                      </TouchableOpacity>
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

// ═══════════════════════════════════════════
// Recipe Modal
// ═══════════════════════════════════════════
type RecipeModalProps = {
  state: ModalState;
  onClose: () => void;
  onSave: (recipe: RecipeFormData) => void;
  onSaveForMeal: (recipe: RecipeFormData, dateKey: string, saveAsRecipe: boolean) => void;
  onEdit: () => void;
  onCreateRecipe: () => void;
  onPromote: () => void;
  onDeleteMenu: () => void;
  onWebSearch: () => void;
};

function RecipeModal({ state, onClose, onSave, onSaveForMeal, onEdit, onCreateRecipe, onPromote, onDeleteMenu, onWebSearch }: RecipeModalProps) {
  const { mode, recipe, prefillName, dateKey } = state;
  return (
    <Modal visible={true} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={s.modalContent}>
          <KeyboardAwareScrollView enableOnAndroid extraScrollHeight={16}>
            {mode === "search" && <WebSearchRecipe onCancel={onClose} />}
            {mode === "create-for-meal" && (
              <RecipeFormInline recipe={null} prefillName={prefillName || ""}
                showSaveAsRecipe
                onSave={(r, saveAsRecipe) => onSaveForMeal(r, dateKey ?? "", saveAsRecipe)} onCancel={onClose} />
            )}
            {(mode === "edit" || mode === "create") && (
              <RecipeFormInline recipe={mode === "edit" ? (recipe ?? null) : null}
                prefillName={mode === "create" ? (prefillName || "") : ""} onSave={(r) => onSave(r)} onCancel={onClose} />
            )}
            {mode === "unlinked" && (
              <View>
                <View style={s.modalHeader}>
                  <Text style={{ fontSize: 32 }}>{getEmoji(prefillName ?? "")}</Text>
                  <Text style={[s.modalTitle, { flex: 1 }]}>{prefillName}</Text>
                  <TouchableOpacity onPress={onClose}><Text style={s.closeX}>×</Text></TouchableOpacity>
                </View>
                <Text style={{ fontSize: 13, color: "#8a7e72", marginBottom: 16, lineHeight: 20 }}>このメニューにはレシピが登録されていません。</Text>
                <TouchableOpacity style={s.primaryBtn} onPress={onCreateRecipe}><Text style={s.primaryBtnText}>📝 レシピを作成する</Text></TouchableOpacity>
                <TouchableOpacity style={[s.webSearchBtn, { marginTop: 8 }]} onPress={onWebSearch}><Text style={{ color: "#fff", fontWeight: "600" }}>🔍 WEB検索でレシピ作成</Text></TouchableOpacity>
                <TouchableOpacity style={[s.dangerBtn, { marginTop: 8 }]} onPress={onDeleteMenu}><Text style={s.dangerBtnText}>🗑 献立から外す</Text></TouchableOpacity>
                <TouchableOpacity style={[s.closeBtn, { marginTop: 12 }]} onPress={onClose}><Text style={s.closeBtnText}>閉じる</Text></TouchableOpacity>
              </View>
            )}
            {mode === "view" && recipe && (
              <View>
                <View style={s.modalHeader}>
                  <Text style={{ fontSize: 32 }}>{getEmoji(recipe.name)}</Text>
                  <Text style={[s.modalTitle, { flex: 1 }]}>{recipe.name}</Text>
                  <TouchableOpacity onPress={onClose}><Text style={s.closeX}>×</Text></TouchableOpacity>
                </View>
                <RecipeDetailContent recipe={recipe} />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
                  <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} onPress={onEdit}><Text style={s.primaryBtnText}>📝 レシピを編集</Text></TouchableOpacity>
                  <TouchableOpacity style={s.dangerBtn} onPress={onDeleteMenu}><Text style={s.dangerBtnText}>献立から外す</Text></TouchableOpacity>
                </View>
                {recipe.showInList === false && (
                  <TouchableOpacity style={s.promoteBtn} onPress={onPromote}>
                    <Text style={s.promoteBtnText}>📖 レシピ一覧に追加</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[s.closeBtn, { marginTop: 12 }]} onPress={onClose}><Text style={s.closeBtnText}>閉じる</Text></TouchableOpacity>
              </View>
            )}
          </KeyboardAwareScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════
type RecipeDetailContentProps = { recipe: Recipe };

function RecipeDetailContent({ recipe }: RecipeDetailContentProps) {
  return (
    <View>
      <Text style={s.sectionLabel}>🥕 材料（{recipe.ingredients.length}品）</Text>
      {recipe.ingredients.map((ing, i) => <View key={i} style={s.ingItem}><Text style={{ fontSize: 13, color: "#5a4a3c" }}>{ing}</Text></View>)}
      <Text style={[s.sectionLabel, { marginTop: 16 }]}>👨‍🍳 作り方</Text>
      {recipe.steps.map((step, i) => (
        <View key={i} style={s.stepItem}>
          <View style={s.stepNum}><Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{i + 1}</Text></View>
          <Text style={{ flex: 1, fontSize: 13, color: "#5a4a3c", lineHeight: 20 }}>{step}</Text>
        </View>
      ))}
      {recipe.url && (
        <View style={{ marginTop: 16 }}>
          <Text style={s.sectionLabel}>🔗 参考URL</Text>
          <TouchableOpacity style={s.urlLink} onPress={() => Linking.openURL(recipe.url!)}>
            <Text style={{ fontSize: 13, color: "#4a7ab5" }}>{recipe.url}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

type RecipeFormInlineProps = {
  recipe: Recipe | null;
  prefillName: string;
  showSaveAsRecipe?: boolean;
  onSave: (recipe: RecipeFormData, saveAsRecipe: boolean) => void;
  onCancel: () => void;
};

function RecipeFormInline({ recipe, prefillName, showSaveAsRecipe = false, onSave, onCancel }: RecipeFormInlineProps) {
  const [name, setName] = useState(recipe?.name || prefillName || "");
  const [url, setUrl] = useState(recipe?.url || "");
  const [ingredients, setIngredients] = useState(recipe?.ingredients?.join("\n") || "");
  const [steps, setSteps] = useState(recipe?.steps?.join("\n") || "");
  const [saveAsRecipe, setSaveAsRecipe] = useState(false);
  const [fetchingTitle, setFetchingTitle] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState<string | null>(null);

  const handleUrlBlur = async (): Promise<void> => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl || name.trim()) return;
    setFetchingTitle(true);
    const title = await fetchRecipeTitle(trimmedUrl);
    if (title) setName(title);
    setFetchingTitle(false);
  };

  const handleExtract = async (): Promise<void> => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    setExtracting(true);
    setExtractMsg(null);
    const result = await extractRecipe(trimmedUrl);
    setExtracting(false);
    if (!result || result.error) {
      setExtractMsg("情報を取得できませんでした");
      return;
    }
    // 既入力データは保護し、空欄のみを埋める
    if (result.title && !name.trim()) setName(result.title);
    if (result.ingredients && !ingredients.trim()) setIngredients(result.ingredients.join("\n"));
    if (result.instructions && !steps.trim()) setSteps(result.instructions.join("\n"));
    if (!result.ingredients && !result.instructions) setExtractMsg("材料・作り方を取得できませんでした");
  };

  const handleSave = (): void => {
    const t = name.trim();
    if (!t) return;
    onSave({
      ...(recipe ?? {}),
      name: t,
      url: url.trim() || undefined,
      ingredients: ingredients.split("\n").map((x) => x.trim()).filter(Boolean),
      steps: steps.split("\n").map((x) => x.trim()).filter(Boolean),
    } as RecipeFormData, saveAsRecipe);
  };

  return (
    <View>
      <View style={s.modalHeader}>
        <Text style={{ fontSize: 28 }}>{name ? getEmoji(name) : "📝"}</Text>
        <Text style={[s.modalTitle, { flex: 1 }]}>{recipe ? "レシピ編集" : "新しいレシピ"}</Text>
        <TouchableOpacity onPress={onCancel}><Text style={s.closeX}>×</Text></TouchableOpacity>
      </View>
      <Text style={s.formLabel}>レシピ名</Text>
      <TextInput style={s.input} value={name} onChangeText={setName} placeholder="例：カレーライス" placeholderTextColor="#c9a88c" />
      <Text style={s.formLabel}>参考URL（任意）</Text>
      <TextInput style={s.input} value={url} onChangeText={setUrl} onBlur={handleUrlBlur} placeholder="https://..." placeholderTextColor="#c9a88c" keyboardType="url" autoCapitalize="none" />
      {fetchingTitle && <Text style={{ fontSize: 11, color: "#a08979", marginBottom: 4 }}>レシピ名を取得中...</Text>}
      <TouchableOpacity
        style={[s.webSearchBtn, { marginBottom: 8, opacity: extracting || !url.trim() ? 0.5 : 1 }]}
        onPress={handleExtract}
        disabled={extracting || !url.trim()}
      >
        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
          {extracting ? "取得中..." : "🔗 URLからレシピ情報を取得"}
        </Text>
      </TouchableOpacity>
      {extractMsg && <Text style={{ fontSize: 11, color: "#c0392b", marginBottom: 6 }}>{extractMsg}</Text>}
      <Text style={s.formLabel}>材料（1行に1つ）</Text>
      <TextInput style={[s.input, { height: 100, textAlignVertical: "top" }]} value={ingredients} onChangeText={setIngredients} multiline placeholder={"例：\n豚肉 200g\n玉ねぎ 2個"} placeholderTextColor="#c9a88c" />
      <Text style={s.formLabel}>作り方（1行に1ステップ）</Text>
      <TextInput style={[s.input, { height: 100, textAlignVertical: "top" }]} value={steps} onChangeText={setSteps} multiline placeholder={"例：\n野菜と肉を切る\n鍋で炒める"} placeholderTextColor="#c9a88c" />
      {showSaveAsRecipe && (
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 }}
          onPress={() => setSaveAsRecipe(p => !p)}
          activeOpacity={0.7}
        >
          <View style={[s.checkbox, saveAsRecipe && s.checkboxChecked]}>
            {saveAsRecipe && <Text style={{ color: "#fff", fontSize: 12 }}>✓</Text>}
          </View>
          <Text style={{ fontSize: 14, color: "#4a3f36" }}>レシピとして保存する</Text>
        </TouchableOpacity>
      )}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
        <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} onPress={handleSave}><Text style={s.primaryBtnText}>{recipe ? "保存する" : "献立に追加"}</Text></TouchableOpacity>
        <TouchableOpacity style={s.closeBtn} onPress={onCancel}><Text style={s.closeBtnText}>キャンセル</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Category Manager Modal ───────────────────────────────────────────────────
type CategoryManagerModalProps = {
  categories: RecipeCategory[];
  setCategories: React.Dispatch<React.SetStateAction<RecipeCategory[]>>;
  onDeleteCategory: (id: string) => void;
  onClose: () => void;
};

function CategoryManagerModal({ categories, setCategories, onDeleteCategory, onClose }: CategoryManagerModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newCatName, setNewCatName] = useState("");

  const handleStartEdit = (cat: RecipeCategory): void => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };
  const handleSaveEdit = (): void => {
    const t = editingName.trim();
    if (!t) return;
    setCategories(p => p.map(c => c.id === editingId ? { ...c, name: t } : c));
    setEditingId(null);
  };
  const handleAdd = (): void => {
    const t = newCatName.trim();
    if (!t) return;
    setCategories(p => [...p, { id: `cat-${Date.now()}`, name: t }]);
    setNewCatName("");
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { maxHeight: "70%" }]}>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { flex: 1 }]}>カテゴリを管理</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={s.closeX}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {categories.map(cat => (
              <View key={cat.id} style={s.catRow}>
                {editingId === cat.id ? (
                  <>
                    <TextInput
                      style={[s.input, { flex: 1, paddingVertical: 6 }]}
                      value={editingName}
                      onChangeText={setEditingName}
                      autoFocus
                    />
                    <TouchableOpacity style={s.catSaveBtn} onPress={handleSaveEdit}>
                      <Text style={{ fontSize: 12, color: "#fff", fontWeight: "600" }}>保存</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.catCancelBtn} onPress={() => setEditingId(null)}>
                      <Text style={{ fontSize: 12, color: "#8a7e72" }}>×</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={{ fontSize: 14, color: "#4a3f36", flex: 1 }}>{cat.name}</Text>
                    <TouchableOpacity style={s.catEditBtn} onPress={() => handleStartEdit(cat)}>
                      <Text style={{ fontSize: 11, color: "#a08979" }}>編集</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.catDeleteBtn} onPress={() => onDeleteCategory(cat.id)}>
                      <Text style={{ fontSize: 11, color: "#c0564e" }}>削除</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ))}
            {/* 新規追加 */}
            <View style={[s.catRow, { marginTop: 8, borderStyle: "dashed" }]}>
              <TextInput
                style={[s.input, { flex: 1, paddingVertical: 6 }]}
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="新しいカテゴリ名"
                placeholderTextColor="#c9a88c"
                onSubmitEditing={handleAdd}
                returnKeyType="done"
              />
              <TouchableOpacity style={s.catSaveBtn} onPress={handleAdd}>
                <Text style={{ fontSize: 12, color: "#fff", fontWeight: "600" }}>追加</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          <TouchableOpacity style={[s.closeBtn, { marginTop: 12 }]} onPress={onClose}>
            <Text style={s.closeBtnText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Recipe Form Full ─────────────────────────────────────────────────────────
type RecipeFormFullProps = {
  recipe: RecipeFormData | null;
  onSave: (recipe: RecipeFormData) => void;
  onCancel: () => void;
  onDelete: ((id: string) => void) | null;
  categories: RecipeCategory[];
  setCategories: React.Dispatch<React.SetStateAction<RecipeCategory[]>>;
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
};

function RecipeFormFull({ recipe, onSave, onCancel, onDelete, categories, setCategories, setRecipes }: RecipeFormFullProps) {
  const [name, setName] = useState(recipe?.name || "");
  const [url, setUrl] = useState(recipe?.url || "");
  const [ingredients, setIngredients] = useState(recipe?.ingredients?.join("\n") || "");
  const [steps, setSteps] = useState(recipe?.steps?.join("\n") || "");
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>(recipe?.categoryIds || []);
  const [confirmDel, setConfirmDel] = useState(false);
  const [catManagerVisible, setCatManagerVisible] = useState(false);
  const [fetchingTitle, setFetchingTitle] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState<string | null>(null);

  const handleUrlBlur = async (): Promise<void> => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl || name.trim()) return;
    setFetchingTitle(true);
    const title = await fetchRecipeTitle(trimmedUrl);
    if (title) setName(title);
    setFetchingTitle(false);
  };

  const handleExtract = async (): Promise<void> => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    setExtracting(true);
    setExtractMsg(null);
    const result = await extractRecipe(trimmedUrl);
    setExtracting(false);
    if (!result || result.error) {
      setExtractMsg("情報を取得できませんでした");
      return;
    }
    // 既入力データは保護し、空欄のみを埋める
    if (result.title && !name.trim()) setName(result.title);
    if (result.ingredients && !ingredients.trim()) setIngredients(result.ingredients.join("\n"));
    if (result.instructions && !steps.trim()) setSteps(result.instructions.join("\n"));
    if (!result.ingredients && !result.instructions) setExtractMsg("材料・作り方を取得できませんでした");
  };

  const toggleCat = (id: string): void => {
    setSelectedCatIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };
  const handleDeleteCategory = (id: string): void => {
    setCategories(p => p.filter(c => c.id !== id));
    setSelectedCatIds(p => p.filter(x => x !== id));
    // 全レシピのcategoryIdsからも削除（孤立参照のクリーンアップ）
    setRecipes(p => p.map(r =>
      r.categoryIds?.includes(id)
        ? { ...r, categoryIds: r.categoryIds.filter(c => c !== id) }
        : r
    ));
  };

  const handleSave = (): void => {
    const t = name.trim();
    if (!t) return;
    onSave({
      ...(recipe ?? {}),
      name: t,
      url: url.trim() || undefined,
      ingredients: ingredients.split("\n").map((x) => x.trim()).filter(Boolean),
      steps: steps.split("\n").map((x) => x.trim()).filter(Boolean),
      categoryIds: selectedCatIds,
    } as RecipeFormData);
  };

  return (
    <View>
      <Text style={s.formLabel}>レシピ名</Text>
      <TextInput style={s.input} value={name} onChangeText={setName} placeholder="例：カレーライス" placeholderTextColor="#c9a88c" />
      <Text style={s.formLabel}>参考URL（任意）</Text>
      <TextInput style={s.input} value={url} onChangeText={setUrl} onBlur={handleUrlBlur} placeholder="https://..." placeholderTextColor="#c9a88c" keyboardType="url" autoCapitalize="none" />
      {fetchingTitle && <Text style={{ fontSize: 11, color: "#a08979", marginBottom: 4 }}>レシピ名を取得中...</Text>}
      <TouchableOpacity
        style={[s.webSearchBtn, { marginBottom: 8, opacity: extracting || !url.trim() ? 0.5 : 1 }]}
        onPress={handleExtract}
        disabled={extracting || !url.trim()}
      >
        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
          {extracting ? "取得中..." : "🔗 URLからレシピ情報を取得"}
        </Text>
      </TouchableOpacity>
      {extractMsg && <Text style={{ fontSize: 11, color: "#c0392b", marginBottom: 6 }}>{extractMsg}</Text>}
      <Text style={s.formLabel}>材料（1行に1つ）</Text>
      <TextInput style={[s.input, { height: 120, textAlignVertical: "top" }]} value={ingredients} onChangeText={setIngredients} multiline placeholder={"例：\n豚肉 200g\n玉ねぎ 2個"} placeholderTextColor="#c9a88c" />
      <Text style={s.formLabel}>作り方（1行に1ステップ）</Text>
      <TextInput style={[s.input, { height: 120, textAlignVertical: "top" }]} value={steps} onChangeText={setSteps} multiline placeholder={"例：\n野菜と肉を切る\n鍋で炒める"} placeholderTextColor="#c9a88c" />

      {/* カテゴリ */}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14, marginBottom: 6 }}>
        <Text style={[s.formLabel, { marginTop: 0, marginBottom: 0, flex: 1 }]}>カテゴリ</Text>
        <TouchableOpacity style={s.catManageBtn} onPress={() => setCatManagerVisible(true)}>
          <Text style={{ fontSize: 11, color: "#8a7e72" }}>＋ 管理</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {categories.length === 0 ? (
          <Text style={{ fontSize: 12, color: "#b8a594" }}>「管理」からカテゴリを追加できます</Text>
        ) : (
          categories.map(cat => {
            const selected = selectedCatIds.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[s.filterChip, selected && s.filterChipActive]}
                onPress={() => toggleCat(cat.id)}
              >
                <Text style={[s.filterChipText, selected && s.filterChipTextActive]}>
                  {selected ? "✓ " : ""}{cat.name}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {catManagerVisible && (
        <CategoryManagerModal
          categories={categories}
          setCategories={setCategories}
          onDeleteCategory={handleDeleteCategory}
          onClose={() => setCatManagerVisible(false)}
        />
      )}

      <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
        <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} onPress={handleSave}><Text style={s.primaryBtnText}>{recipe ? "保存する" : "レシピを追加"}</Text></TouchableOpacity>
        <TouchableOpacity style={s.closeBtn} onPress={onCancel}><Text style={s.closeBtnText}>キャンセル</Text></TouchableOpacity>
      </View>
      {onDelete && (
        <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: "#f0e5d8", paddingTop: 12 }}>
          {!confirmDel ? (
            <TouchableOpacity onPress={() => setConfirmDel(true)}><Text style={{ fontSize: 12, color: "#c0564e" }}>このレシピを削除</Text></TouchableOpacity>
          ) : (
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: "#c0564e" }}>本当に削除しますか？</Text>
              <TouchableOpacity style={s.dangerBtn} onPress={() => { if (recipe?.id) { onDelete(recipe.id); } }}><Text style={s.dangerBtnText}>削除する</Text></TouchableOpacity>
              <TouchableOpacity style={s.closeBtn} onPress={() => setConfirmDel(false)}><Text style={s.closeBtnText}>やめる</Text></TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

type RecipeViewModalProps = {
  recipe: Recipe;
  onClose: () => void;
  onAddToMeal: () => void;
};

function RecipeViewModal({ recipe, onClose, onAddToMeal }: RecipeViewModalProps) {
  return (
    <Modal visible={true} animationType="slide" transparent>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View />
      </TouchableOpacity>
      <View style={[s.modalContent, { position: "absolute", bottom: 0, left: 0, right: 0 }]}>
        <ScrollView>
          <View style={s.modalHeader}>
            <Text style={{ fontSize: 32 }}>{getEmoji(recipe.name)}</Text>
            <Text style={[s.modalTitle, { flex: 1 }]}>{recipe.name}</Text>
            <TouchableOpacity onPress={onClose}><Text style={s.closeX}>×</Text></TouchableOpacity>
          </View>
          <RecipeDetailContent recipe={recipe} />
          <TouchableOpacity style={[s.primaryBtn, { marginTop: 20 }]} onPress={onAddToMeal}><Text style={s.primaryBtnText}>📅 献立に追加</Text></TouchableOpacity>
          <TouchableOpacity style={[s.closeBtn, { marginTop: 12 }]} onPress={onClose}><Text style={s.closeBtnText}>閉じる</Text></TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

type DatePickerModalProps = {
  recipe: Recipe;
  menus: Menus;
  onSelect: (dateKey: string) => void;
  onClose: () => void;
};

function DatePickerModal({ recipe, menus, onSelect, onClose }: DatePickerModalProps) {
  const dates = genFutureDates();
  const todayKey = getDateKey(new Date());
  return (
    <Modal visible={true} animationType="slide" transparent>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}><View /></TouchableOpacity>
      <View style={[s.modalContent, { position: "absolute", bottom: 0, left: 0, right: 0 }]}>
        <View style={s.modalHeader}>
          <Text style={{ fontSize: 24 }}>{getEmoji(recipe.name)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#4a3f36" }}>「{recipe.name}」を追加</Text>
            <Text style={{ fontSize: 11, color: "#b8a594", marginTop: 2 }}>日付を選んでください</Text>
          </View>
          <TouchableOpacity onPress={onClose}><Text style={s.closeX}>×</Text></TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: 400 }}>
          {dates.map((date) => {
            const key = getDateKey(date);
            const { month, day, weekday } = formatDate(date);
            const label = getDayLabel(date);
            const isToday = key === todayKey;
            const items = menus[key] || [];
            return (
              <TouchableOpacity key={key} style={[s.datePickerItem, isToday && s.datePickerItemToday]} onPress={() => onSelect(key)}>
                <View style={{ alignItems: "center", width: 40 }}>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: isToday ? "#d4725c" : "#4a3f36" }}>{day}</Text>
                  <Text style={{ fontSize: 10, color: "#b8a594" }}>{month}月({weekday})</Text>
                </View>
                <View style={{ flex: 1 }}>
                  {label && <Text style={{ fontSize: 10, fontWeight: "700", color: "#d4725c" }}>{label} </Text>}
                  <Text style={{ fontSize: 11, color: items.length > 0 ? "#8a8079" : "#c9a88c" }}>
                    {items.length > 0 ? items.map(i => i.name).join("、") : "まだ登録なし"}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, color: "#d4725c" }}>+</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={[s.closeBtn, { marginTop: 12 }]} onPress={onClose}><Text style={s.closeBtnText}>キャンセル</Text></TouchableOpacity>
      </View>
    </Modal>
  );
}

type MoveDatePickerModalProps = {
  item: MenuItem;
  sourceKey: string;
  futureDateKeys: string[];
  menus: Menus;
  onSelect: (dateKey: string) => void;
  onClose: () => void;
};

function MoveDatePickerModal({ item, sourceKey, futureDateKeys, menus, onSelect, onClose }: MoveDatePickerModalProps) {
  const todayKey = getDateKey(new Date());
  return (
    <Modal visible={true} animationType="slide" transparent>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}><View /></TouchableOpacity>
      <View style={[s.modalContent, { position: "absolute", bottom: 0, left: 0, right: 0 }]}>
        <View style={s.modalHeader}>
          <Text style={{ fontSize: 24 }}>{getEmoji(item.name)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#4a3f36" }}>「{item.name}」を移動</Text>
            <Text style={{ fontSize: 11, color: "#b8a594", marginTop: 2 }}>移動先の日付を選んでください</Text>
          </View>
          <TouchableOpacity onPress={onClose}><Text style={s.closeX}>×</Text></TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: 400 }}>
          {futureDateKeys.filter(k => k !== sourceKey).map((key) => {
            const date = new Date(key + "T00:00:00");
            const { month, day, weekday } = formatDate(date);
            const label = getDayLabel(date);
            const isToday = key === todayKey;
            const items = menus[key] || [];
            return (
              <TouchableOpacity key={key} style={[s.datePickerItem, isToday && s.datePickerItemToday]} onPress={() => onSelect(key)}>
                <View style={{ alignItems: "center", width: 40 }}>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: isToday ? "#d4725c" : "#4a3f36" }}>{day}</Text>
                  <Text style={{ fontSize: 10, color: "#b8a594" }}>{month}月({weekday})</Text>
                </View>
                <View style={{ flex: 1 }}>
                  {label && <Text style={{ fontSize: 10, fontWeight: "700", color: "#d4725c" }}>{label} </Text>}
                  <Text style={{ fontSize: 11, color: items.length > 0 ? "#8a8079" : "#c9a88c" }}>
                    {items.length > 0 ? items.map(i => i.name).join("、") : "まだ登録なし"}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, color: "#d4725c" }}>→</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={[s.closeBtn, { marginTop: 12 }]} onPress={onClose}><Text style={s.closeBtnText}>キャンセル</Text></TouchableOpacity>
      </View>
    </Modal>
  );
}

type WebSearchRecipeProps = {
  onCancel: () => void;
};

const SEARCH_LIMIT = 10;

function WebSearchRecipe({ onCancel }: WebSearchRecipeProps) {
  const [query, setQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<WebSearchItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [searchedQuery, setSearchedQuery] = useState<string>("");

  const doSearch = async (q: string, off: number): Promise<void> => {
    setLoading(true); setError(null);
    try {
      const data = await searchRecipeFromWeb(q, off);
      setResults(data.recipes);
      setTotal(data.total);
    } catch {
      setError("レシピの取得に失敗しました。別のキーワードで試してください。");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (): Promise<void> => {
    const t = query.trim(); if (!t) return;
    setOffset(0); setSearchedQuery(t);
    await doSearch(t, 0);
  };

  const handlePrev = async (): Promise<void> => {
    const newOffset = Math.max(0, offset - SEARCH_LIMIT);
    setOffset(newOffset);
    await doSearch(searchedQuery, newOffset);
  };

  const handleNext = async (): Promise<void> => {
    const newOffset = offset + SEARCH_LIMIT;
    setOffset(newOffset);
    await doSearch(searchedQuery, newOffset);
  };

  const hasPrev = offset > 0;
  const hasNext = offset + SEARCH_LIMIT < total;
  const currentFrom = total === 0 ? 0 : offset + 1;
  const currentTo = Math.min(offset + SEARCH_LIMIT, total);

  return (
    <View>
      <View style={s.modalHeader}>
        <Text style={{ fontSize: 28 }}>🔍</Text>
        <Text style={[s.modalTitle, { flex: 1 }]}>WEB検索でレシピを探す</Text>
        <TouchableOpacity onPress={onCancel}><Text style={s.closeX}>×</Text></TouchableOpacity>
      </View>
      <Text style={{ fontSize: 12, color: "#8a7e72", marginBottom: 12, lineHeight: 18 }}>料理名を入力するとWebからレシピを検索します。タップするとレシピページを開きます。</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput style={[s.input, { flex: 1 }]} value={query} onChangeText={setQuery} placeholder="例：チキン南蛮" placeholderTextColor="#c9a88c" editable={!loading} onSubmitEditing={handleSearch} />
        <TouchableOpacity style={[s.primaryBtn, { opacity: loading || !query.trim() ? 0.6 : 1 }]} onPress={handleSearch} disabled={loading || !query.trim()}>
          <Text style={s.primaryBtnText}>{loading ? "..." : "検索"}</Text>
        </TouchableOpacity>
      </View>
      {loading && (
        <View style={{ alignItems: "center", padding: 32 }}>
          <ActivityIndicator size="large" color="#d4725c" />
          <Text style={{ fontSize: 13, color: "#b8a594", marginTop: 12 }}>検索中...</Text>
        </View>
      )}
      {error && (
        <View style={{ marginTop: 12, padding: 10, backgroundColor: "#fdeeed", borderRadius: 10 }}>
          <Text style={{ fontSize: 12, color: "#c0564e" }}>{error}</Text>
        </View>
      )}
      {!loading && results.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 12, color: "#8a7e72", marginBottom: 8 }}>{total}件中 {currentFrom}〜{currentTo}件目</Text>
          {results.map((r, i) => (
            <TouchableOpacity key={i}
              style={{ flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#fffcf8", borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: "rgba(220,200,180,0.3)" }}
              onPress={() => { if (r.url) Linking.openURL(r.url); }}
              disabled={!r.url}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#4a3f36" }}>{r.name}</Text>
                {r.source ? <Text style={{ fontSize: 11, color: "#b8a594", marginTop: 2 }}>{r.source}</Text> : null}
              </View>
              <Text style={{ fontSize: 16, color: r.url ? "#d4725c" : "#ddc8b4" }}>→</Text>
            </TouchableOpacity>
          ))}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={[s.closeBtn, { flex: 1, opacity: hasPrev ? 1 : 0.4 }]} onPress={handlePrev} disabled={!hasPrev || loading}>
              <Text style={s.closeBtnText}>← 前へ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.closeBtn, { flex: 1, opacity: hasNext ? 1 : 0.4 }]} onPress={handleNext} disabled={!hasNext || loading}>
              <Text style={s.closeBtnText}>次へ →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {!loading && results.length === 0 && searchedQuery !== "" && !error && (
        <View style={{ alignItems: "center", padding: 24 }}>
          <Text style={{ fontSize: 13, color: "#b8a594" }}>検索結果が見つかりませんでした</Text>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf5ef" },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20, backgroundColor: "#d4725c", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerIcon: { fontSize: 28, width: 48, height: 48, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 14, textAlign: "center", lineHeight: 48, overflow: "hidden" },
  title: { fontSize: 22, fontWeight: "900", color: "#fff", letterSpacing: 1.5 },
  subtitle: { fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 1 },
  headerGreeting: { fontSize: 12, fontWeight: "700", color: "#fff" },
  headerHouse: { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  tabBar: { flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  tabBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8, paddingHorizontal: 4, gap: 2, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1.5, borderColor: "#e8ddd0" },
  tabActive: { backgroundColor: "#d4725c", borderColor: "transparent", shadowColor: "#d4725c", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 6, elevation: 4 },
  tabIcon: { fontSize: 18, opacity: 0.55 },
  tabIconActive: { opacity: 1 },
  tabText: { fontSize: 11, fontWeight: "600", color: "#a09080" },
  tabTextActive: { color: "#fff", fontWeight: "700" },

  card: { flexDirection: "row", backgroundColor: "#fffcf8", borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: "rgba(220,200,180,0.3)", minHeight: 76 },
  cardSwapSource: { borderColor: "#5a8a4a", borderWidth: 2 },
  dateSectionSwapTarget: { backgroundColor: "rgba(90,138,74,0.12)" },
  swapBanner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#5a8a4a" },
  cardToday: { borderWidth: 2, borderColor: "#e8956e", backgroundColor: "#fffdf9", shadowColor: "#d4725c", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  cardArchive: { opacity: 0.65, backgroundColor: "#faf7f2" },
  dateSection: { width: 70, alignItems: "center", justifyContent: "center", padding: 12, backgroundColor: "#fef9f3", borderRightWidth: 1, borderRightColor: "rgba(220,200,180,0.3)", borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  dateSectionToday: { backgroundColor: "#d4725c", borderRightWidth: 0 },
  dateSectionArchive: { backgroundColor: "#f5f1ec" },
  dayLabel: { fontSize: 9, fontWeight: "700", color: "#d4725c" },
  dayLabelToday: { color: "rgba(255,255,255,0.95)" },
  dateNum: { fontSize: 24, fontWeight: "900", color: "#4a3f36" },
  dateNumToday: { color: "#fff" },
  menuSection: { flex: 1, padding: 10, paddingLeft: 14, justifyContent: "center", gap: 6 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#fff7ef", borderRadius: 20, borderWidth: 1, borderColor: "rgba(232,149,110,0.2)" },
  chipArchive: { backgroundColor: "#f8f4ef", borderColor: "rgba(200,180,160,0.15)" },
  chipText: { fontSize: 13, fontWeight: "500", color: "#5a4a3c" },

  addModeSelect: { flexDirection: "row", gap: 6, alignItems: "center" },
  modeBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: "#fff7ef", borderRadius: 12, borderWidth: 1, borderColor: "rgba(232,149,110,0.25)" },
  modeCancelBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", backgroundColor: "#f5ebe2", borderRadius: 8, marginLeft: "auto" },
  addBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1.5, borderColor: "#ddc8b4", borderRadius: 20, borderStyle: "dashed", alignSelf: "flex-start" },
  addBtnEmpty: { paddingVertical: 8, paddingHorizontal: 16 },
  recipePickerItem: { padding: 10, backgroundColor: "#fff7ef", borderRadius: 10, borderWidth: 1, borderColor: "rgba(232,149,110,0.15)", marginBottom: 4 },

  mealsEmptyHint: { alignItems: "center", padding: 20, paddingVertical: 24, marginBottom: 10, backgroundColor: "#fffcf8", borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(220,200,180,0.5)", borderStyle: "dashed" },

  // ── 今日のごはん ヒーローカード ──
  hero: { position: "relative", overflow: "hidden", backgroundColor: "#fff7ef", borderRadius: 22, padding: 16, paddingBottom: 18, borderWidth: 2, borderColor: "#e8956e", marginBottom: 14, shadowColor: "#d4725c", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 5 },
  heroSwapActive: { borderColor: "#5a8a4a", backgroundColor: "rgba(90,138,74,0.1)" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  heroTag: { fontSize: 15, fontWeight: "900", color: "#c0563f", letterSpacing: 0.5 },
  heroDate: { marginLeft: "auto", backgroundColor: "#d4725c", paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20 },
  heroDateText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  heroMeals: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  heroMeal: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: "rgba(232,149,110,0.3)", shadowColor: "#b4785a", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  heroMealName: { fontSize: 15, fontWeight: "700", color: "#4a3f36" },
  heroEmpty: { fontSize: 13, color: "#b8a594", fontStyle: "italic", marginBottom: 12 },
  heroAdd: { paddingVertical: 11, backgroundColor: "#d4725c", borderRadius: 12, alignItems: "center" },
  heroAddText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  heroSwapHint: { paddingVertical: 11, backgroundColor: "rgba(90,138,74,0.15)", borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(90,138,74,0.4)" },
  heroCancelSwap: { paddingVertical: 8, alignItems: "center" },

  // ── ノート風の区切り / 綴じ線 ──
  nbDivider: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2, marginBottom: 12, paddingHorizontal: 2 },
  nbDividerLine: { flex: 1, height: 1.5, backgroundColor: "rgba(201,168,140,0.5)", borderRadius: 1 },
  nbDividerLabel: { fontSize: 11, fontWeight: "700", color: "#a09585", letterSpacing: 1 },
  nlist: { position: "relative", paddingLeft: 14 },
  nlistBindLine: { position: "absolute", left: 4, top: 6, bottom: 6, width: 2, backgroundColor: "rgba(232,149,110,0.35)", borderRadius: 2 },

  archiveToggle: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, paddingHorizontal: 16, backgroundColor: "rgba(180,165,148,0.1)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(180,165,148,0.2)" },
  archiveBadge: { marginLeft: "auto", backgroundColor: "rgba(201,168,140,0.15)", paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },

  // Recipe tab
  newRecipeBtn: { alignItems: "center", padding: 14, backgroundColor: "#fff7ef", borderRadius: 14, borderWidth: 1.5, borderColor: "#e8c8ae", borderStyle: "dashed", marginBottom: 8 },
  webSearchBtn: { alignItems: "center", padding: 14, backgroundColor: "#4a7ab5", borderRadius: 14, marginBottom: 12 },
  recipeSearchBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: "#fffaf5", borderRadius: 12, borderWidth: 1.5, borderColor: "#e8c8ae", marginBottom: 12 },
  recipeSearchInput: { flex: 1, fontSize: 14, color: "#4a3f36", paddingVertical: 8 },
  recipeCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: "#fffcf8", borderRadius: 14, borderWidth: 1, borderColor: "rgba(220,200,180,0.3)", marginBottom: 8 },
  recipeCardLeft: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff7ef", alignItems: "center", justifyContent: "center" },
  recipeAddMealBtn: { paddingVertical: 5, paddingHorizontal: 10, backgroundColor: "#d4725c", borderRadius: 7 },
  recipeEditBtn: { paddingVertical: 5, paddingHorizontal: 10, backgroundColor: "#f5ebe2", borderRadius: 7, alignItems: "center" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fffcf8", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#4a3f36" },
  closeX: { fontSize: 22, color: "#a08979", width: 32, height: 32, textAlign: "center", lineHeight: 32, backgroundColor: "#f5ebe2", borderRadius: 10, overflow: "hidden" },

  // Buttons
  primaryBtn: { padding: 12, backgroundColor: "#d4725c", borderRadius: 10, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  closeBtn: { padding: 12, backgroundColor: "#f5ebe2", borderRadius: 10, alignItems: "center" },
  closeBtnText: { color: "#8a7e72", fontWeight: "600", fontSize: 14 },
  dangerBtn: { padding: 12, backgroundColor: "#fdeeed", borderRadius: 10, alignItems: "center" },
  dangerBtnText: { color: "#c0564e", fontWeight: "500", fontSize: 12 },
  promoteBtn: { padding: 12, backgroundColor: "#5f9e7a", borderRadius: 10, alignItems: "center", marginTop: 8 },
  promoteBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  saveBtn: { padding: 10, backgroundColor: "#d4725c", borderRadius: 8, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  cancelBtn: { padding: 5, paddingHorizontal: 12, backgroundColor: "#f5ebe2", borderRadius: 8 },
  cancelBtnText: { color: "#a08979", fontSize: 11 },
  formBackBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#f5ebe2", borderRadius: 8 },

  // Form
  formLabel: { fontSize: 12, fontWeight: "600", color: "#8a7e72", marginBottom: 6, marginTop: 14 },
  formCard: { backgroundColor: "#fffcf8", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "rgba(220,200,180,0.3)" },
  input: { padding: 10, paddingHorizontal: 14, fontSize: 14, borderWidth: 1.5, borderColor: "#e8c8ae", borderRadius: 12, backgroundColor: "#fffaf5", color: "#4a3f36" },

  // Recipe detail
  sectionLabel: { fontSize: 14, fontWeight: "700", color: "#6a5d50", marginBottom: 8 },
  ingItem: { padding: 8, paddingHorizontal: 12, backgroundColor: "#fff7ef", borderRadius: 10, borderWidth: 1, borderColor: "rgba(232,149,110,0.12)", marginBottom: 4 },
  stepItem: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 8, paddingHorizontal: 12, backgroundColor: "#faf7f2", borderRadius: 10, marginBottom: 6 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#d4725c", alignItems: "center", justifyContent: "center" },
  stepNumSmall: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#d4725c", alignItems: "center", justifyContent: "center" },
  urlLink: { padding: 10, paddingHorizontal: 14, backgroundColor: "#f0f7ff", borderRadius: 10, borderWidth: 1, borderColor: "rgba(74,122,181,0.15)" },

  // Date picker
  datePickerItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, paddingHorizontal: 14, backgroundColor: "#fffcf8", borderRadius: 12, borderWidth: 1, borderColor: "rgba(220,200,180,0.3)", marginBottom: 4 },
  datePickerItemToday: { backgroundColor: "#fff7ef", borderColor: "#e8956e", borderWidth: 1.5 },

  // COOP
  coopOrderInfo: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, backgroundColor: "#fffcf8", borderRadius: 14, borderWidth: 1, borderColor: "rgba(220,200,180,0.3)", marginBottom: 12 },
  refreshBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: "#f5ebe2", borderRadius: 10 },
  coopCatSection: { backgroundColor: "#fffcf8", borderRadius: 14, borderWidth: 1, borderColor: "rgba(220,200,180,0.3)", marginBottom: 8, overflow: "hidden" },
  coopCatHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, paddingHorizontal: 14 },
  coopCatLabel: { fontSize: 14, fontWeight: "700" },
  coopSelBadge: { backgroundColor: "rgba(212,114,92,0.1)", paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  selectAllBtn: { paddingVertical: 6, paddingHorizontal: 14, marginHorizontal: 14, marginBottom: 8, backgroundColor: "#f5ebe2", borderRadius: 8, alignSelf: "flex-start" },
  coopItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, paddingHorizontal: 12, marginHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: "transparent", marginBottom: 2 },
  coopItemSel: { backgroundColor: "#fff7ef", borderColor: "rgba(232,149,110,0.2)" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#ddc8b4", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: "#d4725c", borderColor: "transparent" },
  coopActionBar: { padding: 14, paddingBottom: 20, backgroundColor: "#f0e5d8", borderTopWidth: 1, borderTopColor: "rgba(220,200,180,0.3)" },
  coopActionBtn: { padding: 12, backgroundColor: "#d4725c", borderRadius: 10, alignItems: "center" },
  planAllBtn: { padding: 12, backgroundColor: "#5a8a4a", borderRadius: 10, alignItems: "center" },
  planDayBtn: { padding: 10, backgroundColor: "#5a8a4a", borderRadius: 10, alignItems: "center" },
  googleBtn: { padding: 10, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "rgba(74,122,181,0.3)", borderRadius: 10, alignItems: "center" },
  coopRecipeCard: { backgroundColor: "#fffcf8", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "rgba(220,200,180,0.3)" },
  coopInfoBox: { padding: 8, paddingHorizontal: 12, backgroundColor: "rgba(180,165,148,0.08)", borderRadius: 10, marginBottom: 12 },
  ingTagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 8 },
  ingTag: { paddingVertical: 3, paddingHorizontal: 8, backgroundColor: "#fff7ef", borderRadius: 12, borderWidth: 1, borderColor: "rgba(232,149,110,0.15)" },
  dayBadge: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#5a8a4a", borderRadius: 10, alignItems: "center" },

  // Recipe category filter chips
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: "#fff7ef", borderRadius: 20, borderWidth: 1, borderColor: "rgba(232,149,110,0.25)" },
  filterChipActive: { backgroundColor: "#d4725c", borderColor: "transparent" },
  filterChipText: { fontSize: 13, fontWeight: "500", color: "#8a7e72" },
  filterChipTextActive: { color: "#fff", fontWeight: "700" },

  // Category labels on recipe cards
  catLabel: { paddingVertical: 2, paddingHorizontal: 8, backgroundColor: "#fff7ef", borderRadius: 10, borderWidth: 1, borderColor: "rgba(232,149,110,0.2)" },
  catLabelText: { fontSize: 10, fontWeight: "600", color: "#d4725c" },

  // Category management in form
  catRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#fffcf8", borderRadius: 10, borderWidth: 1, borderColor: "rgba(220,200,180,0.25)", marginBottom: 4 },
  catCheckWrap: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#ddc8b4", alignItems: "center", justifyContent: "center" },
  catCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#ddc8b4", alignItems: "center", justifyContent: "center" },
  catCheckOn: { backgroundColor: "#d4725c", borderColor: "transparent" },
  catEditBtn: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: "#f5ebe2", borderRadius: 7 },
  catDeleteBtn: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: "#fdeeed", borderRadius: 7 },
  catSaveBtn: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: "#d4725c", borderRadius: 7 },
  catCancelBtn: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: "#f5ebe2", borderRadius: 7 },
  catAddBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#fff7ef", borderRadius: 10, borderWidth: 1.5, borderColor: "#ddc8b4", borderStyle: "dashed", alignSelf: "flex-start", marginTop: 4 },
  catManageBtn: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: "#f5ebe2", borderRadius: 8, borderWidth: 1, borderColor: "rgba(220,200,180,0.4)" },
});

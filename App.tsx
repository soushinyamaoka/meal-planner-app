import React, { useState } from "react";
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform, StatusBar as NativeStatusBar } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { StatusBar } from "expo-status-bar";
import { genId, getGreeting } from "./src/utils/helpers";
import { Recipe, RecipeFormData, MenuItem, ModalState } from "./src/types";
import { useAuth } from "./src/hooks/useAuth";
import { useHousehold } from "./src/hooks/useHousehold";
import { useFirestore } from "./src/hooks/useFirestore";
import { useNurseryMenus } from "./src/hooks/useNurseryMenus";
import { clearHouseholdCache } from "./src/utils/localCache";
import LoginScreen from "./src/screens/LoginScreen";
import { HouseholdSetupScreen, HouseholdSettingsPanel, ApiSettingsPanel } from "./src/screens/HouseholdScreen";
import { useNoticesFeed } from "./src/hooks/useNoticesFeed";
import { MaintenanceBanner, NoticeBell, NoticesModal } from "./src/components/Notices";
import { s } from "./src/styles/appStyles";
import { MealsTab } from "./src/tabs/MealsTab";
import { NurseryMenuTab } from "./src/tabs/NurseryMenuTab";
import { RecipesTab } from "./src/tabs/RecipesTab";
import { CoopTab } from "./src/tabs/CoopTab";
import { RecipeModal, RecipeViewModal, DatePickerModal } from "./src/components/RecipeModals";

const externalScreenTopInset = Platform.OS === "ios" ? 44 : NativeStatusBar.currentHeight ?? 24;
function ExternalNoticeLayout({ children, feed, visible, onOpen, onClose }: {
  children: React.ReactNode;
  feed: ReturnType<typeof useNoticesFeed>;
  visible: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: "#faf5ef" }}>
      <View style={{ paddingTop: externalScreenTopInset }}><MaintenanceBanner feed={feed} onOpen={onOpen} /></View>
      <View style={{ flex: 1, marginTop: -externalScreenTopInset }}>{children}</View>
      <NoticesModal visible={visible} onClose={onClose} feed={feed} />
    </View>
  );
}

// ═══════════════════════════════════════════
// Main App
// ═══════════════════════════════════════════
export default function App() {
  const { user, loading: authLoading, authLoading: signingIn, error: authError, setError: clearAuthError, signIn, signUp, resetPassword, logout } = useAuth();
  const { household, loadingHousehold, pendingInvite, loadError: householdError, createHousehold, joinHousehold, declineInvite, inviteByEmail } = useHousehold(user);
  const { menus, setMenus, recipes, setRecipes, categories, setCategories, saveRecipeWithMenu, saveRecipesWithMenus, loadingData, loadError: dataError, saveError, dismissSaveFailure } = useFirestore(household?.id ?? null);
  const { nurseryMenus, loadingNurseryMenus, nurseryMenuError } = useNurseryMenus(household?.id ?? null);
  const notices = useNoticesFeed();
  const [noticesOpen, setNoticesOpen] = useState(false);
  const openNotices = (): void => { notices.markVisibleRead(); setNoticesOpen(true); };

  const handleLogout = async (): Promise<void> => {
    if (household?.id) await clearHouseholdCache(household.id);
    await logout();
  };

  const [tab, setTab] = useState<"meals" | "recipes" | "coop" | "settings" | "nursery">("meals");
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | "new" | "websearch" | null>(null);
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);
  const [addToMealRecipe, setAddToMealRecipe] = useState<Recipe | null>(null);

  // ─── 初期化エラー ─────────────────────────────────────────────────────────────
  const fatalError = householdError || dataError;
  if (fatalError && user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#faf5ef" }}>
        <MaintenanceBanner feed={notices} onOpen={openNotices} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <StatusBar style="dark" />
        <Text style={{ fontSize: 32, marginBottom: 12 }}>⚠️</Text>
        <Text style={{ color: "#c0564e", fontSize: 14, textAlign: "center", marginBottom: 8 }}>{fatalError}</Text>
        <Text style={{ color: "#a08979", fontSize: 12, textAlign: "center", marginBottom: 20 }}>
          通信状態を確認のうえ、アプリを再起動してください
        </Text>
        <TouchableOpacity
          style={{ paddingVertical: 10, paddingHorizontal: 20, backgroundColor: "#f5ebe2", borderRadius: 10 }}
          onPress={handleLogout}
        >
          <Text style={{ color: "#8a7e72", fontSize: 13 }}>ログアウト</Text>
        </TouchableOpacity>
        </View>
        <NoticesModal visible={noticesOpen} onClose={() => setNoticesOpen(false)} feed={notices} />
      </SafeAreaView>
    );
  }

  // ─── 読み込み中 ───────────────────────────────────────────────────────────────
  if (authLoading || loadingHousehold || (household && loadingData)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#faf5ef" }}>
        <MaintenanceBanner feed={notices} onOpen={openNotices} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#d4725c" />
        <Text style={{ color: "#a08979", marginTop: 12, fontSize: 14 }}>読み込み中...</Text>
        </View>
        <NoticesModal visible={noticesOpen} onClose={() => setNoticesOpen(false)} feed={notices} />
      </SafeAreaView>
    );
  }

  // ─── 未ログイン ───────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <ExternalNoticeLayout feed={notices} visible={noticesOpen} onOpen={openNotices} onClose={() => setNoticesOpen(false)}>
        <LoginScreen
        onSignIn={signIn}
        onSignUp={signUp}
        onResetPassword={resetPassword}
        authLoading={signingIn}
        error={authError}
        onClearError={() => clearAuthError(null)}
        />
      </ExternalNoticeLayout>
    );
  }

  // ─── グループ未所属 ────────────────────────────────────────────────────────────
  if (!household) {
    return (
      <ExternalNoticeLayout feed={notices} visible={noticesOpen} onOpen={openNotices} onClose={() => setNoticesOpen(false)}>
        <HouseholdSetupScreen
        user={user}
        pendingInvite={pendingInvite}
        onCreateHousehold={createHousehold}
        onJoinHousehold={joinHousehold}
        onDeclineInvite={declineInvite}
        onLogout={handleLogout}
        />
      </ExternalNoticeLayout>
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
    if (modalState?.menuRef) {
      const { dateKey, index } = modalState.menuRef;
      saveRecipeWithMenu(full, dateKey, (currentItems) => {
        const items = [...currentItems];
        if (items[index]) items[index] = { ...items[index], id: items[index].id ?? genId(), name: full.name, recipeId: id };
        return items;
      });
    } else if (!savedRecipe.id) {
      setRecipes(p => [...p, full]);
    } else {
      setRecipes(p => p.map(r => r.id === id ? full : r));
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
    saveRecipeWithMenu(full, dateKey, (items) => [
      ...items,
      { id: genId(), name: full.name, recipeId: id },
    ]);
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
        <NoticeBell count={notices.unreadCount} onPress={openNotices} />
      </View>

      {saveError && (
        <View accessibilityRole="alert" style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: "#fdeeed" }}>
          <Text style={{ flex: 1, color: "#c0564e", fontSize: 12 }}>{saveError}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="保存失敗の通知を閉じる" onPress={dismissSaveFailure}>
            <Text style={{ color: "#8a4b43", fontSize: 18, paddingHorizontal: 4 }}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      <MaintenanceBanner feed={notices} onOpen={openNotices} />

      {/* Tabs */}
      <View style={s.tabBar}>
        {[
          { key: "meals", icon: "📅", label: "献立" },
          { key: "nursery", icon: "🍱", label: "給食" },
          { key: "recipes", icon: "📖", label: "レシピ" },
          { key: "coop", icon: "🛒", label: "COOP" },
          { key: "settings", icon: "👥", label: "設定" },
        ].map(t => (
          <TouchableOpacity key={t.key} style={[s.tabBtn, tab === t.key && s.tabActive]}
            activeOpacity={0.7}
            onPress={() => { setTab(t.key as "meals" | "recipes" | "coop" | "settings" | "nursery"); clearModals(); }}>
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
      {tab === "nursery" && (
        <NurseryMenuTab
          nurseryMenus={nurseryMenus}
          loading={loadingNurseryMenus}
          error={nurseryMenuError}
        />
      )}
      {tab === "recipes" && (
        <RecipesTab recipes={recipes} setRecipes={setRecipes}
          onViewRecipe={setViewRecipe} editingRecipe={editingRecipe}
          setEditingRecipe={setEditingRecipe} onAddToMeal={setAddToMealRecipe}
          categories={categories} setCategories={setCategories} />
      )}
      {/* CoopTabはタブ切替時もマウント維持（提案結果のsavedFlags等を保持） */}
      <View style={{ flex: 1, display: tab === "coop" ? "flex" : "none" }}>
        <CoopTab recipes={recipes} setRecipes={setRecipes} menus={menus} setMenus={setMenus} saveRecipesWithMenus={saveRecipesWithMenus} />
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
            onLogout={handleLogout}
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
      <NoticesModal visible={noticesOpen} onClose={() => setNoticesOpen(false)} feed={notices} />
    </SafeAreaView>
  );
}

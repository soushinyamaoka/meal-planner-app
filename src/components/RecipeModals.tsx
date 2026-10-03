import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { getDateKey, getDayLabel, formatDate, genFutureDates, getEmoji } from "../utils/helpers";
import { fetchRecipeTitle, extractRecipe } from "../api";
import { Recipe, RecipeFormData, Menus, ModalState } from "../types";
import { s } from "../styles/appStyles";
import { RecipeDetailContent, WebSearchRecipe } from "./RecipeShared";

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

export function RecipeModal({ state, onClose, onSave, onSaveForMeal, onEdit, onCreateRecipe, onPromote, onDeleteMenu, onWebSearch }: RecipeModalProps) {
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
  const [memo, setMemo] = useState(recipe?.memo || "");
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
      memo: memo.trim() || undefined,
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
      <Text style={s.formLabel}>メモ（任意）</Text>
      <TextInput style={[s.input, { height: 70, textAlignVertical: "top" }]} value={memo} onChangeText={setMemo} multiline placeholder={"例：子どもの分は辛さ控えめ"} placeholderTextColor="#c9a88c" />
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

type RecipeViewModalProps = {
  recipe: Recipe;
  onClose: () => void;
  onAddToMeal: () => void;
};

export function RecipeViewModal({ recipe, onClose, onAddToMeal }: RecipeViewModalProps) {
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

export function DatePickerModal({ recipe, menus, onSelect, onClose }: DatePickerModalProps) {
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

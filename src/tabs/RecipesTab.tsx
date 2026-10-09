import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { getEmoji, genId } from "../utils/helpers";
import { fetchRecipeTitle, extractRecipe } from "../api";
import { Recipe, RecipeFormData, RecipeCategory } from "../types";
import { s } from "../styles/appStyles";
import { WebSearchRecipe } from "../components/RecipeShared";

// ═══════════════════════════════════════════
// Recipes Tab
// ═══════════════════════════════════════════
type RecipesTabProps = {
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  checkRecipeUsed: (recipe: Recipe) => Promise<boolean>;
  removeRecipe: (recipeId: string, keepData: boolean) => void;
  onViewRecipe: (recipe: Recipe) => void;
  editingRecipe: Recipe | "new" | "websearch" | null;
  setEditingRecipe: React.Dispatch<React.SetStateAction<Recipe | "new" | "websearch" | null>>;
  onAddToMeal: (recipe: Recipe) => void;
  categories: RecipeCategory[];
  setCategories: React.Dispatch<React.SetStateAction<RecipeCategory[]>>;
};

export function RecipesTab({ recipes, setRecipes, checkRecipeUsed, removeRecipe, onViewRecipe, editingRecipe, setEditingRecipe, onAddToMeal, categories, setCategories }: RecipesTabProps) {
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
            checkUsed={editingRecipe !== "new" ? () => checkRecipeUsed(editingRecipe) : null}
            onDelete={editingRecipe !== "new" ? (id, keepData) => { removeRecipe(id, keepData); setEditingRecipe(null); } : null} />
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
  onDelete: ((id: string, keepData: boolean) => void) | null;
  checkUsed?: (() => Promise<boolean>) | null;
  categories: RecipeCategory[];
  setCategories: React.Dispatch<React.SetStateAction<RecipeCategory[]>>;
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
};

function RecipeFormFull({ recipe, onSave, onCancel, onDelete, checkUsed, categories, setCategories, setRecipes }: RecipeFormFullProps) {
  const [name, setName] = useState(recipe?.name || "");
  const [url, setUrl] = useState(recipe?.url || "");
  const [ingredients, setIngredients] = useState(recipe?.ingredients?.join("\n") || "");
  const [steps, setSteps] = useState(recipe?.steps?.join("\n") || "");
  const [memo, setMemo] = useState(recipe?.memo || "");
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>(recipe?.categoryIds || []);
  // 削除の確認状態。keep: 一覧から外してデータを残す / delete: 物理削除する
  const [confirmDel, setConfirmDel] = useState<null | "checking" | "keep" | "delete">(null);
  const [catManagerVisible, setCatManagerVisible] = useState(false);
  const [fetchingTitle, setFetchingTitle] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState<string | null>(null);
  const hasNonBlankUrl = typeof recipe?.url === "string" && recipe.url.trim().length > 0;

  // URLありのレシピと、献立で使ったことがあるレシピは、データを残して一覧から外す。
  const startDelete = async (): Promise<void> => {
    if (hasNonBlankUrl || !checkUsed) { setConfirmDel("keep"); return; }
    setConfirmDel("checking");
    const used = await checkUsed();
    setConfirmDel(current => (current === "checking" ? (used ? "keep" : "delete") : current));
  };

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
      memo: memo.trim() || undefined,
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
      <Text style={s.formLabel}>メモ（任意）</Text>
      <TextInput style={[s.input, { height: 80, textAlignVertical: "top" }]} value={memo} onChangeText={setMemo} multiline placeholder={"例：子どもの分は辛さ控えめ／倍量で作ると◯"} placeholderTextColor="#c9a88c" />

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
          {confirmDel === null ? (
            <TouchableOpacity onPress={() => { void startDelete(); }}><Text style={{ fontSize: 12, color: "#c0564e" }}>{hasNonBlankUrl ? "このレシピを一覧から外す" : "このレシピを削除"}</Text></TouchableOpacity>
          ) : confirmDel === "checking" ? (
            <Text style={{ fontSize: 12, color: "#a08979" }}>献立で使ったことがあるか確認しています…</Text>
          ) : (
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Text style={{ flex: 1, fontSize: 12, color: "#c0564e" }}>{confirmDel === "keep"
                ? (hasNonBlankUrl ? "一覧から外します。レシピデータは保持されます。" : "献立で使ったことがあるため、一覧から外します。レシピデータは保持されます。")
                : "本当に削除しますか？"}</Text>
              <TouchableOpacity style={s.dangerBtn} onPress={() => { if (recipe?.id) { onDelete(recipe.id, confirmDel === "keep"); } }}><Text style={s.dangerBtnText}>{confirmDel === "keep" ? "一覧から外す" : "削除する"}</Text></TouchableOpacity>
              <TouchableOpacity style={s.closeBtn} onPress={() => setConfirmDel(null)}><Text style={s.closeBtnText}>やめる</Text></TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

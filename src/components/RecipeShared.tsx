import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Linking } from "react-native";
import { searchRecipeFromWeb } from "../api";
import { Recipe, WebSearchItem } from "../types";
import { s } from "../styles/appStyles";

// ═══════════════════════════════════════════
// Shared Components
// ═══════════════════════════════════════════
type RecipeDetailContentProps = { recipe: Recipe };

export function RecipeDetailContent({ recipe }: RecipeDetailContentProps) {
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
      {recipe.memo && (
        <View style={{ marginTop: 16 }}>
          <Text style={s.sectionLabel}>📝 メモ</Text>
          <Text style={{ fontSize: 13, color: "#5a4a3c", lineHeight: 20 }}>{recipe.memo}</Text>
        </View>
      )}
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

type WebSearchRecipeProps = {
  onCancel: () => void;
};

const SEARCH_LIMIT = 10;

export function WebSearchRecipe({ onCancel }: WebSearchRecipeProps) {
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

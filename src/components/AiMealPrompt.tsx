import React, { Dispatch, SetStateAction, useEffect, useMemo, useRef } from "react";
import { Alert, Keyboard, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { formatDate, genId, getDateKey } from "../utils/helpers";
import { buildAiMealPrompt, parseAiMealPlan, ParsedMeal } from "../utils/aiMealPlan";
import { Menus, Recipe, MenuItem } from "../types";
import { AiMealDraft, resetAiMealDraft } from "../utils/aiMealDraft";

type Props = { draft: AiMealDraft; setDraft: Dispatch<SetStateAction<AiMealDraft>>; selectedNames: string[]; menus: Menus; recipes: Recipe[]; saveRecipesWithMenus: (recipes: Recipe[], menuUpdates: Record<string, MenuItem[]>) => void; onBack: () => void };
export function AiMealPrompt({ draft, setDraft, selectedNames, menus, recipes, saveRecipesWithMenus, onBack }: Props) {
  const updateField = <K extends keyof AiMealDraft>(key: K, value: SetStateAction<AiMealDraft[K]>): void => {
    setDraft(current => ({ ...current, [key]: typeof value === "function" ? (value as (previous: AiMealDraft[K]) => AiMealDraft[K])(current[key]) : value }));
  };
  const ingredients = draft.ingredients;
  const otherIngredients = draft.otherIngredients;
  const startOffset = draft.startOffset;
  const days = draft.days;
  const people = draft.people;
  const notes = draft.notes;
  const prompt = draft.prompt;
  const answer = draft.answer;
  const preview = draft.preview;
  const unreadable = draft.unreadable;
  const notice = draft.notice;
  const expanded = draft.expanded;
  const setIngredients = (value: SetStateAction<string[]>) => updateField("ingredients", value);
  const setOtherIngredients = (value: SetStateAction<string>) => updateField("otherIngredients", value);
  const setStartOffset = (value: SetStateAction<number>) => updateField("startOffset", value);
  const setDays = (value: SetStateAction<number>) => updateField("days", value);
  const setPeople = (value: SetStateAction<number>) => updateField("people", value);
  const setNotes = (value: SetStateAction<string>) => updateField("notes", value);
  const setPrompt = (value: SetStateAction<string>) => updateField("prompt", value);
  const setAnswer = (value: SetStateAction<string>) => updateField("answer", value);
  const setPreview = (value: SetStateAction<ParsedMeal[] | null>) => updateField("preview", value);
  const setUnreadable = (value: SetStateAction<string[]>) => updateField("unreadable", value);
  const setNotice = (value: SetStateAction<string>) => updateField("notice", value);
  const setExpanded = (value: SetStateAction<Set<string>>) => updateField("expanded", value);
  const scrollRef = useRef<ScrollView | null>(null);
  const previewY = useRef(0);
  // 読み取った後、プレビューの位置まで画面を送る（貼り付け欄が長くても、結果を探さなくてよいように）
  useEffect(() => {
    if (!preview) return;
    const timer = setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, previewY.current - 12), animated: true }), 150);
    return () => clearTimeout(timer);
  }, [preview]);
  const startDate =useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + startOffset); return d; }, [startOffset]);
  const allIngredients = [...ingredients, ...otherIngredients.split(/[\n、,，]+/).map(x => x.trim()).filter(Boolean)];
  const adjust = (value: number, delta: number, min: number, max: number, setter: (v: number) => void) => setter(Math.max(min, Math.min(max, value + delta)));
  const counter = (label: string, value: number, min: number, max: number, setter: (v: number) => void) => <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 10 }}><Text style={{ flex: 1, color: "#5a4a3c" }}>{label}: {value}</Text><TouchableOpacity onPress={() => adjust(value, -1, min, max, setter)} style={{ padding: 8, backgroundColor: "#f5ebe2", borderRadius: 7 }}><Text>−</Text></TouchableOpacity><TouchableOpacity onPress={() => adjust(value, 1, min, max, setter)} style={{ padding: 8, backgroundColor: "#f5ebe2", borderRadius: 7 }}><Text>＋</Text></TouchableOpacity></View>;
  const button = (label: string, onPress: () => void, color = "#d4725c") => <TouchableOpacity onPress={onPress} style={{ padding: 11, alignItems: "center", backgroundColor: color, borderRadius: 9, marginTop: 10 }}><Text style={{ color: "white", fontWeight: "700" }}>{label}</Text></TouchableOpacity>;
  const readAnswer = () => { Keyboard.dismiss(); const result = parseAiMealPlan(answer, startDate); setPreview(result.meals); setUnreadable(result.unreadableLines); setNotice(""); };
  const clearAnswer = () => { setAnswer(""); setPreview(null); setUnreadable([]); setExpanded(new Set()); };
  const resetDraft = () => Alert.alert("入力をリセット", "入力内容をすべてリセットしますか？", [
    { text: "キャンセル", style: "cancel" },
    { text: "リセットする", style: "destructive", onPress: () => setDraft(resetAiMealDraft(selectedNames)) },
  ]);
  const apply = () => {
    // 料理のない日付（回答が途中で切れた等）は反映しない。空で置き換えると、その日の献立が消えるため。
    const days = (preview ?? []).filter(day => day.dishes.length > 0);
    if (!days.length) return;
    const created = new Map<string, Recipe>();
    const menuUpdates: Record<string, MenuItem[]> = {};
    days.forEach(day => {
      menuUpdates[day.dateKey] = day.dishes.map(dish => {
        const registered = recipes.find(r => r.showInList !== false && r.name === dish.name);
        if (registered) return { id: genId(), name: dish.name, recipeId: registered.id };
        if (dish.ingredients.length && dish.steps.length) {
          let recipe = created.get(dish.name);
          if (!recipe) {
            recipe = { id: genId(), name: dish.name, ingredients: dish.ingredients, steps: dish.steps, showInList: false };
            created.set(dish.name, recipe);
          }
          return { id: genId(), name: dish.name, recipeId: recipe.id };
        }
        return { id: genId(), name: dish.name };
      });
    });
    saveRecipesWithMenus([...created.values()], menuUpdates);
    setNotice(`${days.length}日分の献立を反映しました`); setAnswer(""); setPreview(null); setUnreadable([]); setExpanded(new Set());
  };
  // キーボードが開いたとき、タップした入力欄（貼り付け欄など）が隠れないよう、他の入力画面と同じ
  // KeyboardAwareScrollView を使う。innerRef は、読み取り後にプレビューへ画面を送る scrollTo のために受け取る。
  return <KeyboardAwareScrollView innerRef={(ref: unknown) => { scrollRef.current = ref as ScrollView | null; }} enableOnAndroid extraScrollHeight={16} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 35 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}><TouchableOpacity onPress={onBack} style={{ padding: 8, backgroundColor: "#f5ebe2", borderRadius: 8 }}><Text style={{ color: "#a08979" }}>← 戻る</Text></TouchableOpacity><Text style={{ flex: 1, fontSize: 17, fontWeight: "700", color: "#4a3f36" }}>🤖 AIに献立を相談</Text><TouchableOpacity onPress={resetDraft} style={{ paddingVertical: 6, paddingHorizontal: 8, backgroundColor: "#f5ebe2", borderRadius: 7 }}><Text style={{ color: "#8a7e72", fontSize: 11, fontWeight: "600" }}>入力をリセット</Text></TouchableOpacity></View>
    {notice ? <Text style={{ padding: 10, color: "#397044", backgroundColor: "#edf7ec", borderRadius: 8 }}>{notice}</Text> : null}
    <Text style={label}>使う食材</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{ingredients.map((name, i) => <TouchableOpacity key={`${name}-${i}`} onPress={() => { setIngredients(current => current.filter((_, index) => index !== i)); updateField("removedIngredients", current => current.includes(name) ? current : [...current, name]); }} style={chip}><Text style={{ color: "#6a5d50" }}>{name} ×</Text></TouchableOpacity>)}</View>
    <Text style={label}>ほかに使いたい食材（任意）</Text><TextInput value={otherIngredients} onChangeText={setOtherIngredients} multiline placeholder="食材を改行・読点・カンマで区切って入力" style={input} />
    <Text style={label}>期間</Text><View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>{[0, 1].map(offset => <TouchableOpacity key={offset} onPress={() => setStartOffset(offset)} style={[chip, { backgroundColor: startOffset === offset ? "#d4725c" : "#f5ebe2" }]}><Text style={{ color: startOffset === offset ? "white" : "#6a5d50" }}>{offset ? "明日" : "今日"}</Text></TouchableOpacity>)}</View>
    {counter("日数", days, 1, 7, setDays)}{counter("人数", people, 1, 8, setPeople)}
    <Text style={label}>補足（任意）</Text><TextInput value={notes} onChangeText={setNotes} multiline placeholder="好み・苦手・アレルギーなど" style={input} />
    {button("プロンプトを作成", () => setPrompt(buildAiMealPrompt({ startDate, days, people, ingredients: allIngredients, notes })))}
    {prompt ? <><Text selectable style={[input, { marginTop: 10, lineHeight: 21 }]}>{prompt}</Text>{button("共有・コピー", () => { void Share.share({ message: prompt }).catch(() => Alert.alert("共有できませんでした")); }, "#8a7e72")}</> : null}
    <Text style={label}>AIの回答を貼り付け</Text><TextInput value={answer} onChangeText={setAnswer} multiline scrollEnabled placeholder="例: 10/5の下に■料理名・材料・作り方を記載" style={[input, { minHeight: 100, maxHeight: 170, textAlignVertical: "top" }]} />
    <View style={{ flexDirection: "row", gap: 8 }}>
      <TouchableOpacity onPress={readAnswer} style={{ flex: 3, padding: 12, alignItems: "center", backgroundColor: "#d4725c", borderRadius: 9, marginTop: 10 }}><Text style={{ color: "white", fontWeight: "700" }}>読み取る</Text></TouchableOpacity>
      <TouchableOpacity onPress={clearAnswer} disabled={!answer && !preview} style={{ flex: 1, padding: 12, alignItems: "center", backgroundColor: "#8a7e72", borderRadius: 9, marginTop: 10, opacity: !answer && !preview ? 0.4 : 1 }}><Text style={{ color: "white", fontWeight: "700" }}>クリア</Text></TouchableOpacity>
    </View>
    {preview && <View onLayout={e => { previewY.current = e.nativeEvent.layout.y; }} style={{ marginTop: 12, padding: 12, backgroundColor: "#fffcf8", borderRadius: 10 }}>
      {preview.length === 0 && <Text>読み取れる献立がありません。</Text>}
      {preview.map(day => {
        const existing = menus[day.dateKey] ?? []; const fd = formatDate(day.date);
        return <View key={day.dateKey} style={{ marginBottom: 10 }}>
          <Text style={{ fontWeight: "700", color: "#4a3f36" }}>{fd.month}/{fd.day}({fd.weekday})</Text>
          {day.dishes.map((dish, i) => {
            const key = `${day.dateKey}-${i}`; const registered = recipes.some(r => r.showInList !== false && r.name === dish.name); const complete = dish.ingredients.length > 0 && dish.steps.length > 0;
            return <View key={key} style={{ marginTop: 6, padding: 8, backgroundColor: "#fff", borderRadius: 7 }}>
              <Text style={{ fontWeight: "600", color: "#4a3f36" }}>{dish.name}</Text>
              {registered ? <Text style={{ color: "#587a54", fontSize: 12 }}>📖 登録済みのレシピを使います</Text> : complete ? <View>
                <TouchableOpacity onPress={() => setExpanded(current => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next; })}><Text style={{ color: "#6a5d50", fontSize: 12 }}>材料{dish.ingredients.length}品・手順{dish.steps.length} {expanded.has(key) ? "▾" : "▸"}</Text></TouchableOpacity>
                {expanded.has(key) && <View style={{ marginTop: 5 }}><Text style={{ fontWeight: "600", color: "#8a7e72" }}>材料</Text>{dish.ingredients.map((item, n) => <Text key={`i-${n}`} style={{ color: "#5a4a3c", fontSize: 12 }}>・{item}</Text>)}<Text style={{ marginTop: 4, fontWeight: "600", color: "#8a7e72" }}>作り方</Text>{dish.steps.map((item, n) => <Text key={`s-${n}`} style={{ color: "#5a4a3c", fontSize: 12 }}>{n + 1}. {item}</Text>)}</View>}
              </View> : <Text style={{ color: "#b05d28", fontSize: 12 }}>⚠ 作り方がありません（料理名だけ反映します）</Text>}
            </View>;
          })}
          {day.dishes.length === 0
            ? <Text style={{ color: "#b05d28", fontSize: 12, marginTop: 4 }}>⚠ 料理がありません（この日は反映しません）</Text>
            : existing.length > 0 && <Text style={{ color: "#b05d28", fontSize: 12, marginTop: 4 }}>⚠ 既存の献立（{existing.map(x => x.name).join("、")}）を置き換えます</Text>}
        </View>;
      })}
      {unreadable.length > 0 && <View><Text style={{ fontWeight: "700", color: "#8a7e72" }}>読み取れなかった行（{unreadable.length}行）</Text>{unreadable.slice(0, 8).map((line, i) => <Text key={i} style={{ color: "#8a7e72" }}>{line || "（空行）"}</Text>)}{unreadable.length > 8 && <Text style={{ color: "#a09585", fontSize: 12 }}>ほか{unreadable.length - 8}行</Text>}</View>}
      {preview.some(day => day.dishes.length > 0) && button("献立に反映", apply)}
    </View>}
  </KeyboardAwareScrollView>;
}

const label = { marginTop: 14, marginBottom: 6, color: "#8a7e72", fontWeight: "600" as const, fontSize: 12 };
const input = { padding: 10, borderWidth: 1, borderColor: "#e8c8ae", borderRadius: 9, color: "#4a3f36", backgroundColor: "#fffaf5" };
const chip = { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 20, backgroundColor: "#f5ebe2" };

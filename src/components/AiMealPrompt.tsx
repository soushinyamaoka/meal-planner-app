import React, { useMemo, useState } from "react";
import { Alert, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from "react-native";
import { formatDate, genId, getDateKey } from "../utils/helpers";
import { buildAiMealPrompt, parseAiMealPlan, ParsedMeal } from "../utils/aiMealPlan";
import { Menus, Recipe, MenuItem } from "../types";

type Props = { selectedNames: string[]; menus: Menus; recipes: Recipe[]; saveRecipesWithMenus: (recipes: Recipe[], menuUpdates: Record<string, MenuItem[]>) => void; onBack: () => void };
export function AiMealPrompt({ selectedNames, menus, recipes, saveRecipesWithMenus, onBack }: Props) {
  const [ingredients, setIngredients] = useState(selectedNames);
  const [otherIngredients, setOtherIngredients] = useState("");
  const [startOffset, setStartOffset] = useState(0);
  const [days, setDays] = useState(3);
  const [people, setPeople] = useState(2);
  const [notes, setNotes] = useState("");
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [preview, setPreview] = useState<ParsedMeal[] | null>(null);
  const [unreadable, setUnreadable] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const startDate = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + startOffset); return d; }, [startOffset]);
  const allIngredients = [...ingredients, ...otherIngredients.split(/[\n、,，]+/).map(x => x.trim()).filter(Boolean)];
  const adjust = (value: number, delta: number, min: number, max: number, setter: (v: number) => void) => setter(Math.max(min, Math.min(max, value + delta)));
  const counter = (label: string, value: number, min: number, max: number, setter: (v: number) => void) => <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 10 }}><Text style={{ flex: 1, color: "#5a4a3c" }}>{label}: {value}</Text><TouchableOpacity onPress={() => adjust(value, -1, min, max, setter)} style={{ padding: 8, backgroundColor: "#f5ebe2", borderRadius: 7 }}><Text>−</Text></TouchableOpacity><TouchableOpacity onPress={() => adjust(value, 1, min, max, setter)} style={{ padding: 8, backgroundColor: "#f5ebe2", borderRadius: 7 }}><Text>＋</Text></TouchableOpacity></View>;
  const button = (label: string, onPress: () => void, color = "#d4725c") => <TouchableOpacity onPress={onPress} style={{ padding: 11, alignItems: "center", backgroundColor: color, borderRadius: 9, marginTop: 10 }}><Text style={{ color: "white", fontWeight: "700" }}>{label}</Text></TouchableOpacity>;
  const readAnswer = () => { const result = parseAiMealPlan(answer, startDate); setPreview(result.meals); setUnreadable(result.unreadableLines); setNotice(""); };
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
    setNotice(`${days.length}日分の献立を反映しました`); setPreview(null);
  };
  return <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 35 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}><TouchableOpacity onPress={onBack} style={{ padding: 8, backgroundColor: "#f5ebe2", borderRadius: 8 }}><Text style={{ color: "#a08979" }}>← 戻る</Text></TouchableOpacity><Text style={{ fontSize: 17, fontWeight: "700", color: "#4a3f36" }}>🤖 AIに献立を相談</Text></View>
    {notice ? <Text style={{ padding: 10, color: "#397044", backgroundColor: "#edf7ec", borderRadius: 8 }}>{notice}</Text> : null}
    <Text style={label}>使う食材</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{ingredients.map((name, i) => <TouchableOpacity key={`${name}-${i}`} onPress={() => setIngredients(current => current.filter((_, index) => index !== i))} style={chip}><Text style={{ color: "#6a5d50" }}>{name} ×</Text></TouchableOpacity>)}</View>
    <Text style={label}>ほかに使いたい食材（任意）</Text><TextInput value={otherIngredients} onChangeText={setOtherIngredients} multiline placeholder="食材を改行・読点・カンマで区切って入力" style={input} />
    <Text style={label}>期間</Text><View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>{[0, 1].map(offset => <TouchableOpacity key={offset} onPress={() => setStartOffset(offset)} style={[chip, { backgroundColor: startOffset === offset ? "#d4725c" : "#f5ebe2" }]}><Text style={{ color: startOffset === offset ? "white" : "#6a5d50" }}>{offset ? "明日" : "今日"}</Text></TouchableOpacity>)}</View>
    {counter("日数", days, 1, 7, setDays)}{counter("人数", people, 1, 8, setPeople)}
    <Text style={label}>補足（任意）</Text><TextInput value={notes} onChangeText={setNotes} multiline placeholder="好み・苦手・アレルギーなど" style={input} />
    {button("プロンプトを作成", () => setPrompt(buildAiMealPrompt({ startDate, days, people, ingredients: allIngredients, notes })))}
    {prompt ? <><Text selectable style={[input, { marginTop: 10, lineHeight: 21 }]}>{prompt}</Text>{button("共有・コピー", () => { void Share.share({ message: prompt }).catch(() => Alert.alert("共有できませんでした")); }, "#8a7e72")}</> : null}
    <Text style={label}>AIの回答を貼り付け</Text><TextInput value={answer} onChangeText={setAnswer} multiline placeholder="例: 10/5の下に■料理名・材料・作り方を記載" style={[input, { minHeight: 100, textAlignVertical: "top" }]} />{button("読み取る", readAnswer)}
    {preview && <View style={{ marginTop: 12, padding: 12, backgroundColor: "#fffcf8", borderRadius: 10 }}>
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
      {unreadable.length > 0 && <View><Text style={{ fontWeight: "700", color: "#8a7e72" }}>読み取れなかった行</Text>{unreadable.map((line, i) => <Text key={i} style={{ color: "#8a7e72" }}>{line || "（空行）"}</Text>)}</View>}
      {preview.some(day => day.dishes.length > 0) && button("献立に反映", apply)}
    </View>}
  </ScrollView>;
}

const label = { marginTop: 14, marginBottom: 6, color: "#8a7e72", fontWeight: "600" as const, fontSize: 12 };
const input = { padding: 10, borderWidth: 1, borderColor: "#e8c8ae", borderRadius: 9, color: "#4a3f36", backgroundColor: "#fffaf5" };
const chip = { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 20, backgroundColor: "#f5ebe2" };

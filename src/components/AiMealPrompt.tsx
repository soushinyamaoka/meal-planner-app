import React, { useMemo, useState } from "react";
import { Alert, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from "react-native";
import { formatDate, genId, getDateKey } from "../utils/helpers";
import { buildAiMealPrompt, parseAiMealPlan, ParsedMeal } from "../utils/aiMealPlan";
import { Menus, Recipe } from "../types";

type Props = { selectedNames: string[]; menus: Menus; recipes: Recipe[]; setMenus: React.Dispatch<React.SetStateAction<Menus>>; onBack: () => void };
export function AiMealPrompt({ selectedNames, menus, recipes, setMenus, onBack }: Props) {
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
  const startDate = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + startOffset); return d; }, [startOffset]);
  const allIngredients = [...ingredients, ...otherIngredients.split(/[\n、,，]+/).map(x => x.trim()).filter(Boolean)];
  const adjust = (value: number, delta: number, min: number, max: number, setter: (v: number) => void) => setter(Math.max(min, Math.min(max, value + delta)));
  const counter = (label: string, value: number, min: number, max: number, setter: (v: number) => void) => <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 10 }}><Text style={{ flex: 1, color: "#5a4a3c" }}>{label}: {value}</Text><TouchableOpacity onPress={() => adjust(value, -1, min, max, setter)} style={{ padding: 8, backgroundColor: "#f5ebe2", borderRadius: 7 }}><Text>−</Text></TouchableOpacity><TouchableOpacity onPress={() => adjust(value, 1, min, max, setter)} style={{ padding: 8, backgroundColor: "#f5ebe2", borderRadius: 7 }}><Text>＋</Text></TouchableOpacity></View>;
  const button = (label: string, onPress: () => void, color = "#d4725c") => <TouchableOpacity onPress={onPress} style={{ padding: 11, alignItems: "center", backgroundColor: color, borderRadius: 9, marginTop: 10 }}><Text style={{ color: "white", fontWeight: "700" }}>{label}</Text></TouchableOpacity>;
  const readAnswer = () => { const result = parseAiMealPlan(answer, startDate); setPreview(result.meals); setUnreadable(result.unreadableLines); setNotice(""); };
  const apply = () => {
    if (!preview?.length) return;
    const byDate = new Map(preview.map(day => [day.dateKey, day.dishes.map(name => {
      const recipe = recipes.find(r => r.showInList !== false && r.name === name);
      return recipe ? { id: genId(), name, recipeId: recipe.id } : { id: genId(), name };
    })]));
    setMenus(current => { const next = { ...current }; byDate.forEach((items, dateKey) => { next[dateKey] = items; }); return next; });
    setNotice(`${preview.length}日分の献立を反映しました`); setPreview(null);
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
    <Text style={label}>AIの回答を貼り付け</Text><TextInput value={answer} onChangeText={setAnswer} multiline placeholder="例: 10/5: 鶏の照り焼き / 味噌汁" style={[input, { minHeight: 100, textAlignVertical: "top" }]} />{button("読み取る", readAnswer)}
    {preview && <View style={{ marginTop: 12, padding: 12, backgroundColor: "#fffcf8", borderRadius: 10 }}>{preview.length === 0 && <Text>読み取れる献立がありません。</Text>}{preview.map(day => { const existing = menus[day.dateKey] ?? []; const fd = formatDate(day.date); return <View key={day.dateKey} style={{ marginBottom: 10 }}><Text style={{ fontWeight: "700", color: "#4a3f36" }}>{fd.month}/{fd.day}({fd.weekday}) {day.dishes.join(" / ")}</Text>{existing.length > 0 && <Text style={{ color: "#b05d28", fontSize: 12 }}>⚠ 既存の献立（{existing.map(x => x.name).join("、")}）を置き換えます</Text>}</View>; })}{unreadable.length > 0 && <View><Text style={{ fontWeight: "700", color: "#8a7e72" }}>読み取れなかった行</Text>{unreadable.map((line, i) => <Text key={i} style={{ color: "#8a7e72" }}>{line || "（空行）"}</Text>)}</View>}{preview.length > 0 && button("献立に反映", apply)}</View>}
  </ScrollView>;
}

const label = { marginTop: 14, marginBottom: 6, color: "#8a7e72", fontWeight: "600" as const, fontSize: 12 };
const input = { padding: 10, borderWidth: 1, borderColor: "#e8c8ae", borderRadius: 9, color: "#4a3f36", backgroundColor: "#fffaf5" };
const chip = { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 20, backgroundColor: "#f5ebe2" };

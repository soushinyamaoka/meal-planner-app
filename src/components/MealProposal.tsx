import { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { MealProposal, MealProposalAdoption, MealProposalDish, MealProposalRole, MenuItem, Menus, Recipe } from "../types";
import { formatDate, genFutureDates, genId, getDateKey } from "../utils/helpers";
import { buildProposalAppend, ProposalPick } from "../utils/mealProposalApply";
import { countUnadoptedDishes } from "../hooks/useMealProposals";

const ROLE_LABELS: Record<MealProposalRole, string> = { main: "主菜", side: "副菜", soup: "汁物", other: "その他" };

const dateLabel = (dateKey: string): string => {
  const { month, day, weekday } = formatDate(new Date(`${dateKey}T00:00:00`));
  return `${month}/${day}(${weekday})`;
};

// ═══════════════════════════════════════════
// 献立タブ上部のお知らせ
// ═══════════════════════════════════════════
export function MealProposalBanner({ proposal, onOpen }: { proposal: MealProposal; onOpen: () => void }) {
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 4 }}>
      <TouchableOpacity accessibilityRole="button" onPress={onOpen} activeOpacity={0.8}
        style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: "#fff7ef", borderRadius: 14, borderWidth: 1.5, borderColor: "#e8956e" }}>
        <Text style={{ fontSize: 24 }}>🤖</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#c0563f" }}>AIの献立提案が届いています</Text>
          <Text style={{ fontSize: 12, color: "#8a7e72", marginTop: 2 }}>
            {dateLabel(proposal.periodStart)}〜{dateLabel(proposal.periodEnd)}・未採用 {countUnadoptedDishes(proposal)}品
          </Text>
        </View>
        {proposal.status === "new" && <Text style={{ fontSize: 10, fontWeight: "800", color: "#fff", backgroundColor: "#d4725c", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: "hidden" }}>NEW</Text>}
        <Text style={{ fontSize: 20, color: "#c9a88c" }}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════
// 提案画面（料理を選び、日付を決めて、献立に反映する）
// ═══════════════════════════════════════════
type MealProposalScreenProps = {
  proposal: MealProposal;
  menus: Menus;
  recipes: Recipe[];
  saveRecipesWithMenus: (newRecipes: Recipe[], menuUpdates: Record<string, MenuItem[]>) => void;
  onAdopted: (adoptions: Record<string, MealProposalAdoption>) => void;
  onDismiss: () => void;
  onBack: () => void;
};

export function MealProposalScreen({ proposal, menus, recipes, saveRecipesWithMenus, onAdopted, onDismiss, onBack }: MealProposalScreenProps) {
  // 選べる日付は献立を読み込んでいる範囲（今日〜DAYS_AFTER日後）だけ。範囲外へ追加すると既存の献立を上書きするおそれがある
  const selectableDateKeys = useMemo(() => genFutureDates().map(getDateKey), []);
  const allDishes = useMemo(() => proposal.days.flatMap(day => day.dishes.map(dish => ({ dish, proposedDate: day.date }))), [proposal]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetDates, setTargetDates] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(allDishes.map(({ dish, proposedDate }) => [dish.id, selectableDateKeys.includes(proposedDate) ? proposedDate : null])));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pickingDateFor, setPickingDateFor] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const isAdopted = (dishId: string): boolean => !!proposal.adoptions[dishId];
  const toggleIn = (set: Set<string>, id: string): Set<string> => { const next = new Set(set); next.has(id) ? next.delete(id) : next.add(id); return next; };
  const picks: ProposalPick[] = allDishes
    .filter(({ dish }) => selected.has(dish.id) && !isAdopted(dish.id) && targetDates[dish.id])
    .map(({ dish }) => ({ dish, dateKey: targetDates[dish.id] as string }));

  const toggleDish = (dish: MealProposalDish): void => {
    // 日付が決まっていない料理は、選ぶと同時に日付の選択を開く
    if (!selected.has(dish.id) && !targetDates[dish.id]) setPickingDateFor(dish.id);
    setSelected(current => toggleIn(current, dish.id));
  };
  // 日付を変えた料理は、その日の見出しの下へ移る。目の前から消えるので、画面下に移した先を出す
  const moveDish = (dish: MealProposalDish, dateKey: string): void => {
    setTargetDates(current => ({ ...current, [dish.id]: dateKey }));
    setSelected(current => new Set(current).add(dish.id));
    setPickingDateFor(null);
    setNotice(`${dish.name}を${dateLabel(dateKey)}に移しました`);
  };
  const selectAll = (): void => setSelected(new Set(allDishes.filter(({ dish }) => !isAdopted(dish.id)).map(({ dish }) => dish.id)));

  const apply = (): void => {
    if (picks.length === 0) return;
    const result = buildProposalAppend({ picks, menus, recipes, genId, now: new Date().toISOString() });
    saveRecipesWithMenus(result.recipesToSave, result.menuUpdates);
    onAdopted(result.adoptions);
    setSelected(new Set());
    setPickingDateFor(null);
    setNotice(`${picks.length}品を献立に追加しました`);
  };

  const confirmDismiss = (): void => Alert.alert("この提案を閉じる", "献立タブのお知らせを消します。追加済みの献立はそのまま残ります。", [
    { text: "キャンセル", style: "cancel" },
    { text: "閉じる", style: "destructive", onPress: onDismiss },
  ]);

  const unadoptedCount = countUnadoptedDishes(proposal);
  const undatedSelected = allDishes.some(({ dish }) => selected.has(dish.id) && !isAdopted(dish.id) && !targetDates[dish.id]);

  // 提案された日ではなく、入れる日（追加済みなら追加した日）ごとに並べる。日付が決まっていない料理は最後にまとめる
  const sections = useMemo(() => {
    const groups = new Map<string, { dish: MealProposalDish; proposedDate: string }[]>();
    allDishes.forEach(entry => {
      const key = proposal.adoptions[entry.dish.id]?.dateKey ?? targetDates[entry.dish.id] ?? "";
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    });
    return [...groups.entries()].sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
  }, [allDishes, proposal.adoptions, targetDates]);

  const renderDish = ({ dish, proposedDate }: { dish: MealProposalDish; proposedDate: string }) => {
    const adoption = proposal.adoptions[dish.id];
    const isSelected = selected.has(dish.id);
    const target = targetDates[dish.id];
    const registered = recipes.some(r => r.showInList !== false && r.name === dish.name);
    const moved = !adoption && !!target && target !== proposedDate;
    const canRestore = selectableDateKeys.includes(proposedDate);
    return (
      <View key={dish.id} style={{ marginTop: 6, padding: 10, backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: isSelected ? "#e8956e" : "#f0e6dc", opacity: adoption ? 0.65 : 1 }}>
        <TouchableOpacity disabled={!!adoption} onPress={() => toggleDish(dish)} style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Text style={{ fontSize: 16, color: adoption ? "#397044" : "#8a7e72" }}>{adoption ? "✓" : isSelected ? "☑" : "□"}</Text>
          <Text style={{ fontSize: 11, color: "#8a7e72", backgroundColor: "#f5ebe2", paddingHorizontal: 5, borderRadius: 4, overflow: "hidden" }}>{ROLE_LABELS[dish.role]}</Text>
          <Text style={{ flexShrink: 1, fontWeight: "700", color: "#4a3f36", fontSize: 14 }}>{dish.name}</Text>
        </TouchableOpacity>
        {(dish.coopItems?.length || dish.note) ? (
          <Text style={{ color: "#8a7e72", fontSize: 12, marginTop: 4 }}>
            {dish.coopItems?.length ? `🛒 ${dish.coopItems.join("・")}` : ""}{dish.coopItems?.length && dish.note ? "　" : ""}{dish.note ? `⏱ ${dish.note}` : ""}
          </Text>
        ) : null}
        {adoption ? (
          <Text style={{ color: "#397044", fontSize: 12, marginTop: 4 }}>✓ {dateLabel(adoption.dateKey)}に追加済み</Text>
        ) : (
          <>
            {moved && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                <Text style={{ color: "#8a7e72", fontSize: 12 }}>↪ {dateLabel(proposedDate)}の提案から移動</Text>
                {canRestore && (
                  <TouchableOpacity onPress={() => moveDish(dish, proposedDate)} hitSlop={8}>
                    <Text style={{ color: "#8a5b45", fontSize: 12, fontWeight: "600", textDecorationLine: "underline" }}>戻す</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {registered && <Text style={{ color: "#587a54", fontSize: 12, marginTop: 4 }}>📖 同じ名前の登録済みレシピを使います</Text>}
            <TouchableOpacity onPress={() => setExpanded(current => toggleIn(current, dish.id))} style={{ marginTop: 4 }}>
              <Text style={{ color: "#6a5d50", fontSize: 12 }}>材料{dish.ingredients.length}品・手順{dish.steps.length} {expanded.has(dish.id) ? "▾" : "▸ 作り方を見る"}</Text>
            </TouchableOpacity>
            {expanded.has(dish.id) && (
              <View style={{ marginTop: 5 }}>
                <Text style={{ fontWeight: "600", color: "#8a7e72", fontSize: 12 }}>材料</Text>
                {dish.ingredients.map((item, n) => <Text key={`i-${n}`} style={{ color: "#5a4a3c", fontSize: 12 }}>・{item}</Text>)}
                <Text style={{ marginTop: 4, fontWeight: "600", color: "#8a7e72", fontSize: 12 }}>作り方</Text>
                {dish.steps.map((item, n) => <Text key={`s-${n}`} style={{ color: "#5a4a3c", fontSize: 12 }}>{n + 1}. {item}</Text>)}
              </View>
            )}
            <TouchableOpacity onPress={() => setPickingDateFor(current => current === dish.id ? null : dish.id)}
              style={{ alignSelf: "flex-start", marginTop: 8, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, backgroundColor: target ? "#f5ebe2" : "#fdeeed" }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: target ? "#6a5d50" : "#c0564e" }}>
                📅 {target ? `${dateLabel(target)}に追加` : "追加する日を選んでください"} {pickingDateFor === dish.id ? "▴" : "▾"}
              </Text>
            </TouchableOpacity>
            {pickingDateFor === dish.id && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 6 }}>
                {selectableDateKeys.map(key => (
                  <TouchableOpacity key={key} onPress={() => (key === target ? setPickingDateFor(null) : moveDish(dish, key))}
                    style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, backgroundColor: key === target ? "#d4725c" : "#f5ebe2" }}>
                    <Text style={{ fontSize: 12, color: key === target ? "#fff" : "#6a5d50" }}>{dateLabel(key)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <TouchableOpacity onPress={onBack} style={{ padding: 8, backgroundColor: "#f5ebe2", borderRadius: 8 }}><Text style={{ color: "#a08979" }}>← 戻る</Text></TouchableOpacity>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: "700", color: "#4a3f36" }}>🤖 AIの献立提案</Text>
        </View>
        <Text style={{ color: "#8a7e72", fontSize: 13 }}>{dateLabel(proposal.periodStart)}〜{dateLabel(proposal.periodEnd)}の提案・未採用 {unadoptedCount}品</Text>
        {proposal.comment ? <Text style={{ marginTop: 8, padding: 10, color: "#5a4a3c", backgroundColor: "#fff7ef", borderRadius: 8, fontSize: 13 }}>💬 {proposal.comment}</Text> : null}
        {unadoptedCount > 0 && (
          <View style={{ flexDirection: "row", gap: 14, marginTop: 10 }}>
            <TouchableOpacity onPress={selectAll}><Text style={{ color: "#8a5b45", fontSize: 13, fontWeight: "600" }}>全部選ぶ</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setSelected(new Set())}><Text style={{ color: "#8a5b45", fontSize: 13, fontWeight: "600" }}>全部外す</Text></TouchableOpacity>
          </View>
        )}
        {sections.map(([dateKey, entries]) => {
          const existing = dateKey ? menus[dateKey] ?? [] : [];
          const hasPending = entries.some(({ dish }) => !isAdopted(dish.id));
          return (
            <View key={dateKey || "undated"} style={{ marginTop: 12 }}>
              <Text style={{ fontWeight: "700", color: dateKey ? "#4a3f36" : "#c0564e" }}>{dateKey ? dateLabel(dateKey) : "日付が決まっていない料理"}</Text>
              {hasPending && existing.length > 0 && (
                <Text style={{ color: "#587a54", fontSize: 12, marginTop: 2 }}>この日の献立：{existing.map(x => x.name).join("、")}（残したまま追加します）</Text>
              )}
              {entries.map(renderDish)}
            </View>
          );
        })}
        <TouchableOpacity onPress={confirmDismiss} style={{ marginTop: 20, padding: 10, alignItems: "center", backgroundColor: "#f5ebe2", borderRadius: 9 }}>
          <Text style={{ color: "#8a7e72", fontSize: 13, fontWeight: "600" }}>この提案を閉じる</Text>
        </TouchableOpacity>
      </ScrollView>
      {(unadoptedCount > 0 || notice) && (
        <View style={{ padding: 12, paddingBottom: 14, borderTopWidth: 1, borderTopColor: "#f0e6dc", backgroundColor: "#faf5ef" }}>
          {notice ? <Text style={{ color: "#397044", fontSize: 12, marginBottom: 6, textAlign: "center" }}>{notice}</Text> : null}
          {unadoptedCount > 0 && undatedSelected && <Text style={{ color: "#c0564e", fontSize: 12, marginBottom: 6, textAlign: "center" }}>日付が決まっていない料理は反映しません</Text>}
          {unadoptedCount > 0 && (
            <TouchableOpacity onPress={apply} disabled={picks.length === 0}
              style={{ padding: 13, alignItems: "center", backgroundColor: "#d4725c", borderRadius: 10, opacity: picks.length === 0 ? 0.5 : 1 }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>選んだ{picks.length}品を献立に反映</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

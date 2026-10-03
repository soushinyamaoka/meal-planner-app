import React, { useState, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, Animated } from "react-native";
import { getDateKey, getDayLabel, formatDate, genFutureDates, genArchiveDates, getEmoji, genId } from "../utils/helpers";
import { Recipe, MenuItem, Menus } from "../types";
import { s } from "../styles/appStyles";

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

export function MealsTab({ menus, setMenus, recipes, onChipTap, onManualAdd }: MealsTabProps) {
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<"recipe" | null>(null);
  const [archiveOpen, setArchiveOpen] = useState<boolean>(false);
  const [swapSourceDate, setSwapSourceDate] = useState<string | null>(null);
  const [moveItem, setMoveItem] = useState<{ dateKey: string; index: number; item: MenuItem } | null>(null);
  // 📖はレシピが実在し、献立専用でない場合のみ表示（削除済みレシピへの参照では出さない）
  const hasListedRecipe = (item: MenuItem): boolean => {
    if (!item.recipeId) return false;
    const recipe = recipes.find(r => r.id === item.recipeId);
    return !!recipe && recipe.showInList !== false;
  };
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
                {hasListedRecipe(item) && <Text style={{ fontSize: 12, opacity: 0.55 }}>📖</Text>}
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
                  {hasListedRecipe(item) && <Text style={{ fontSize: 10, opacity: 0.6 }}>📖</Text>}
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

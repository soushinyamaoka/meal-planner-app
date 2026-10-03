import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { getDateKey, formatDate, getEmoji } from "../utils/helpers";
import { NurseryMenus } from "../types";
import { s } from "../styles/appStyles";

// ═══════════════════════════════════════════
// Nursery Menu Tab（給食タブ・読み取り専用）
// ═══════════════════════════════════════════
// データはscripts/importNurseryMenu.mjsが書き込む。このタブは表示のみ行い、
// 追加・編集・重複チェックは持たない（自宅献立との突き合わせはユーザーの目視判断に委ねる）。
type NurseryMenuTabProps = {
  nurseryMenus: NurseryMenus;
  loading: boolean;
  error: string | null;
};

export function NurseryMenuTab({ nurseryMenus, loading, error }: NurseryMenuTabProps) {
  const months = Array.from(new Set(Object.keys(nurseryMenus).map(k => k.slice(0, 7)))).sort();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const dateListRef = useRef<ScrollView>(null);
  const dateCardPositionsRef = useRef<Record<string, number>>({});
  const hasInitialScrolledRef = useRef(false);
  const today = new Date();
  const todayKey = getDateKey(today);
  const todayMenu = nurseryMenus[todayKey];
  const { month: todayMonth, day: todayDay, weekday: todayWeekday } = formatDate(today);

  useEffect(() => {
    if (months.length > 0 && (!selectedMonth || !months.includes(selectedMonth))) {
      const currentMonth = todayKey.slice(0, 7);
      setSelectedMonth(months.includes(currentMonth) ? currentMonth : months[months.length - 1]);
    }
  }, [months.join(",")]);

  const dateKeys = selectedMonth
    ? Object.keys(nurseryMenus)
      .filter(k => k.startsWith(selectedMonth) && k !== todayKey)
      .sort()
    : [];
  const initialScrollDateKey = dateKeys.find(dateKey => dateKey >= todayKey)
    ?? dateKeys[dateKeys.length - 1];

  useEffect(() => {
    if (selectedMonth && dateKeys.length === 0) {
      hasInitialScrolledRef.current = true;
    }
  }, [selectedMonth, dateKeys.length]);

  const scrollToInitialDate = (dateKey: string, y: number) => {
    dateCardPositionsRef.current[dateKey] = y;
    if (hasInitialScrolledRef.current || dateKey !== initialScrollDateKey) return;

    dateListRef.current?.scrollTo({ y: dateCardPositionsRef.current[dateKey], animated: false });
    hasInitialScrolledRef.current = true;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#d4725c" />
        <Text style={{ color: "#a08979", marginTop: 12, fontSize: 14 }}>給食データを読み込み中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 28 }}>⚠️</Text>
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#c0564e", marginTop: 8 }}>{error}</Text>
      </View>
    );
  }

  if (months.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 28 }}>🍱</Text>
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#6a5d50", marginTop: 8 }}>まだ給食データがありません</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>
        <View style={s.hero}>
          <View style={s.heroRow}>
            <Text style={s.heroTag}>🍱 今日の給食</Text>
            <View style={s.heroDate}>
              <Text style={s.heroDateText}>{todayMonth}/{todayDay} ({todayWeekday})</Text>
            </View>
          </View>

          {todayMenu ? (
            <>
              {todayMenu.menu.length > 0 && (
                <View style={s.heroMeals}>
                  {todayMenu.menu.map((name, i) => (
                    <View key={i} style={s.heroMeal}>
                      <Text style={{ fontSize: 26 }}>{getEmoji(name)}</Text>
                      <Text style={s.heroMealName}>{name}</Text>
                    </View>
                  ))}
                </View>
              )}
              {todayMenu.snack.length > 0 && (
                <View style={s.chipWrap}>
                  {todayMenu.snack.map((name, i) => (
                    <View key={i} style={[s.chip, { backgroundColor: "#f5f0e8" }]}>
                      <Text style={{ fontSize: 11, color: "#8a7e72" }}>おやつ:</Text>
                      <Text style={s.chipText}>{name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <Text style={s.heroEmpty}>今日の給食データはまだありません</Text>
          )}
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
        {months.map((m) => {
          const [y, mo] = m.split("-");
          const active = m === selectedMonth;
          return (
            <TouchableOpacity key={m} style={[s.filterChip, active && s.filterChipActive]} onPress={() => {
              hasInitialScrolledRef.current = true;
              setSelectedMonth(m);
            }}>
              <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{y}年{parseInt(mo, 10)}月</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView ref={dateListRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingTop: 4, paddingBottom: 40 }}>
        {dateKeys.map((dateKey) => {
          const day = nurseryMenus[dateKey];
          const { month, day: dayNum, weekday } = formatDate(new Date(dateKey + "T00:00:00"));
          return (
            <View key={dateKey} style={s.card} onLayout={(event) => scrollToInitialDate(dateKey, event.nativeEvent.layout.y)}>
              <View style={s.dateSection}>
                <Text style={s.dateNum}>{dayNum}</Text>
                <Text style={{ fontSize: 10, color: "#b8a594" }}>{month}月 ({weekday})</Text>
              </View>
              <View style={s.menuSection}>
                {day.menu.length > 0 && (
                  <View style={s.chipWrap}>
                    {day.menu.map((name, i) => (
                      <View key={i} style={s.chip}>
                        <Text style={{ fontSize: 14 }}>{getEmoji(name)}</Text>
                        <Text style={s.chipText}>{name}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {day.snack.length > 0 && (
                  <View style={s.chipWrap}>
                    {day.snack.map((name, i) => (
                      <View key={i} style={[s.chip, { backgroundColor: "#f5f0e8" }]}>
                        <Text style={{ fontSize: 11, color: "#8a7e72" }}>おやつ:</Text>
                        <Text style={s.chipText}>{name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

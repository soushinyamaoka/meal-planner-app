import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { fetchCoopOrderHistory } from "../api";
import { COOP_CATEGORIES } from "../data/sampleData";
import { CoopOrderHistoryEntry } from "../types";

export function CoopOrderHistory({ onBack }: { onBack: () => void }) {
  const [orders, setOrders] = useState<CoopOrderHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const load = async () => {
    setLoading(true); setError(null);
    try { const result = await fetchCoopOrderHistory(); setOrders(result.orders ?? []); }
    catch (e) { setError(e instanceof Error ? e.message : "注文履歴を取得できませんでした"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  return <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}><TouchableOpacity onPress={onBack} style={{ padding: 8, backgroundColor: "#f5ebe2", borderRadius: 8 }}><Text style={{ color: "#a08979" }}>← 戻る</Text></TouchableOpacity><Text style={{ fontSize: 17, fontWeight: "700", color: "#4a3f36" }}>🕘 過去の注文</Text></View>
    {loading ? <ActivityIndicator size="large" color="#d4725c" /> : error ? <View style={{ alignItems: "center", gap: 12 }}><Text style={{ color: "#c0564e" }}>{error}</Text><TouchableOpacity onPress={() => void load()} style={{ padding: 10, backgroundColor: "#a08979", borderRadius: 8 }}><Text style={{ color: "white" }}>再試行</Text></TouchableOpacity></View> : orders.length === 0 ? <Text style={{ textAlign: "center", color: "#8a7e72", padding: 24 }}>注文履歴はまだありません</Text> : orders.map((order, index) => {
      const hasItems = Array.isArray(order.items);
      const isOpen = expanded.has(index);
      return <View key={`${order.order_date}-${index}`} style={{ backgroundColor: "#fffcf8", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#eadfd4" }}>
        <TouchableOpacity onPress={() => setExpanded(current => { const next = new Set(current); isOpen ? next.delete(index) : next.add(index); return next; })} style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ fontWeight: "700", color: "#4a3f36" }}>{order.order_date}</Text><Text style={{ color: "#8a7e72" }}>{order.total_items}品　{hasItems ? (isOpen ? "▴" : "▾") : ""}</Text></TouchableOpacity>
        {!hasItems && <Text style={{ color: "#a09585", fontSize: 11, marginTop: 8 }}>商品一覧はサーバー更新後に表示されます</Text>}
        {hasItems && isOpen && order.items!.map((item, i) => { const category = COOP_CATEGORIES.find(c => c.label === item.category); return <View key={`${i}-${item.name}`} style={{ paddingTop: 10, flexDirection: "row", alignItems: "center", gap: 6 }}><Text>{category?.emoji ?? ""}</Text><View style={{ flex: 1 }}><Text style={{ color: "#5a4a3c" }}>{item.name}</Text>{item.original_name ? <Text style={{ color: "#b8a594", fontSize: 10 }}>{item.original_name}</Text> : null}</View><Text style={{ color: "#8a7e72" }}>×{item.quantity}</Text></View>; })}
      </View>;
    })}
  </ScrollView>;
}

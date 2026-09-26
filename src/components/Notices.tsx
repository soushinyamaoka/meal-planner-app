import React from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Notice } from "../api/notices";

type Feed = { notices: Notice[]; unreadCount: number; stale: boolean; lastSuccessAt: number | null; fetchFailed: boolean; hasCache: boolean; refresh: () => void; markVisibleRead: () => void; isNewAtOpen: (id: string) => boolean };
const dateLabel = (value?: string): string => value ? new Date(value).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
export function NoticeBell({ count, onPress }: { count: number; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={`お知らせ${count ? `、未読${count}件` : ""}`} style={s.bell}><Text style={{ fontSize: 22 }}>🔔</Text>{count > 0 && <View style={s.badge}><Text style={s.badgeText}>{count > 99 ? "99+" : count}</Text></View>}</TouchableOpacity>;
}
export function MaintenanceBanner({ feed, onOpen }: { feed: Feed; onOpen: () => void }) {
  const priority = { in_progress: 3, extended: 2, scheduled: 1 } as const;
  const active = feed.notices.filter((n) => n.kind === "maintenance" && n.maintenance && n.maintenance.status in priority)
    .sort((a, b) => priority[b.maintenance!.status as keyof typeof priority] - priority[a.maintenance!.status as keyof typeof priority]);
  if (!active.length) return null;
  const n = active[0], status = n.maintenance!.status;
  const label = status === "in_progress" ? "メンテナンス中" : status === "extended" ? "メンテナンス延長中" : "メンテナンス予定";
  const text = `${feed.stale ? `${label}（最終確認 ${dateLabel(feed.lastSuccessAt ? new Date(feed.lastSuccessAt).toISOString() : undefined)}）` : label}：${n.title_ja}${active.length > 1 ? `、ほか${active.length - 1}件` : ""}`;
  return <TouchableOpacity onPress={onOpen} style={[s.banner, { backgroundColor: status === "scheduled" ? "#fff1d6" : "#fdeeed", borderColor: status === "scheduled" ? "#e5b35b" : "#c0564e" }]}><Text style={{ color: "#5a4936", fontWeight: "700", fontSize: 13 }}>{text}</Text></TouchableOpacity>;
}
export function NoticesModal({ visible, onClose, feed }: { visible: boolean; onClose: () => void; feed: Feed }) {
  const staleMessage = feed.stale ? `最新情報を取得できていません（最終取得: ${dateLabel(feed.lastSuccessAt ? new Date(feed.lastSuccessAt).toISOString() : undefined)}）` : null;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={s.overlay}><View style={s.sheet}>
      <View style={s.heading}><Text style={s.headingTitle}>お知らせ</Text><TouchableOpacity onPress={onClose}><Text style={s.close}>×</Text></TouchableOpacity></View>
      <ScrollView>
        {staleMessage && <Text style={s.stale}>{staleMessage}</Text>}
        {feed.notices.length === 0 && <Text style={s.empty}>{feed.fetchFailed && !feed.hasCache ? "お知らせを取得できませんでした" : "現在お知らせはありません"}</Text>}
        {feed.notices.map(n => <View key={n.notice_id} style={s.card}><View style={s.titleRow}><View style={[s.dot, !feed.isNewAtOpen(n.notice_id) && { opacity: 0 }]} /><Text style={s.kind}>{n.kind === "feature" ? "お知らせ" : `メンテナンス${n.maintenance ? `・${n.maintenance.status}` : ""}`}</Text></View><Text style={s.title}>{n.title_ja}</Text><Text style={s.body}>{n.message_ja}</Text>{n.action_ja ? <Text style={s.action}>{n.action_ja}</Text> : null}
          <Text style={s.date}>{n.kind === "feature" ? dateLabel(n.published_at) : [n.maintenance?.starts_at, n.maintenance?.expected_end_at].filter(Boolean).map(dateLabel).join("〜")}</Text>{n.kind === "maintenance" && n.maintenance?.next_update_at ? <Text style={s.date}>次回更新: {dateLabel(n.maintenance.next_update_at)}</Text> : null}
        </View>)}
        {feed.fetchFailed && <TouchableOpacity style={s.retry} onPress={feed.refresh}><Text style={{ color: "white", fontWeight: "700" }}>再試行</Text></TouchableOpacity>}
      </ScrollView>
    </View></View>
  </Modal>;
}
const s = StyleSheet.create({ bell: { marginLeft: 8, width: 42, height: 42, alignItems: "center", justifyContent: "center" }, badge: { position: "absolute", right: -1, top: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#c0564e", alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }, badgeText: { color: "white", fontSize: 10, fontWeight: "800" }, banner: { paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1 }, overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }, sheet: { maxHeight: "85%", backgroundColor: "#fffcf8", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 }, heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }, headingTitle: { fontSize: 20, color: "#4a3f36", fontWeight: "800" }, close: { fontSize: 28, color: "#a08979" }, card: { marginVertical: 6, padding: 14, borderRadius: 12, backgroundColor: "#fff7ef" }, titleRow: { flexDirection: "row", alignItems: "center", gap: 8 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4a7ab5" }, kind: { fontSize: 11, color: "#8a7e72", fontWeight: "700" }, title: { fontSize: 15, color: "#4a3f36", fontWeight: "800", marginTop: 6 }, body: { fontSize: 13, color: "#5a4a3c", marginTop: 5, lineHeight: 19 }, action: { fontSize: 12, color: "#8a7e72", marginTop: 6 }, date: { fontSize: 11, color: "#a08979", marginTop: 6 }, stale: { padding: 10, backgroundColor: "#fff1d6", color: "#795b24", borderRadius: 8, marginBottom: 10, fontSize: 12 }, empty: { textAlign: "center", color: "#8a7e72", padding: 24 }, retry: { alignItems: "center", padding: 12, backgroundColor: "#d4725c", borderRadius: 10, marginTop: 10 } });

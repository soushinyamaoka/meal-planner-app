import { StyleSheet } from "react-native";

// ═══════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════
export const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf5ef" },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20, backgroundColor: "#d4725c", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerIcon: { fontSize: 28, width: 48, height: 48, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 14, textAlign: "center", lineHeight: 48, overflow: "hidden" },
  title: { fontSize: 22, fontWeight: "900", color: "#fff", letterSpacing: 1.5 },
  subtitle: { fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 1 },
  headerGreeting: { fontSize: 12, fontWeight: "700", color: "#fff" },
  headerHouse: { fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  tabBar: { flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  tabBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8, paddingHorizontal: 4, gap: 2, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1.5, borderColor: "#e8ddd0" },
  tabActive: { backgroundColor: "#d4725c", borderColor: "transparent", shadowColor: "#d4725c", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 6, elevation: 4 },
  tabIcon: { fontSize: 18, opacity: 0.55 },
  tabIconActive: { opacity: 1 },
  tabText: { fontSize: 11, fontWeight: "600", color: "#a09080" },
  tabTextActive: { color: "#fff", fontWeight: "700" },

  card: { flexDirection: "row", backgroundColor: "#fffcf8", borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: "rgba(220,200,180,0.3)", minHeight: 76 },
  cardSwapSource: { borderColor: "#5a8a4a", borderWidth: 2 },
  dateSectionSwapTarget: { backgroundColor: "rgba(90,138,74,0.12)" },
  swapBanner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#5a8a4a" },
  cardToday: { borderWidth: 2, borderColor: "#e8956e", backgroundColor: "#fffdf9", shadowColor: "#d4725c", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  cardArchive: { opacity: 0.65, backgroundColor: "#faf7f2" },
  dateSection: { width: 70, alignItems: "center", justifyContent: "center", padding: 12, backgroundColor: "#fef9f3", borderRightWidth: 1, borderRightColor: "rgba(220,200,180,0.3)", borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  dateSectionToday: { backgroundColor: "#d4725c", borderRightWidth: 0 },
  dateSectionArchive: { backgroundColor: "#f5f1ec" },
  dayLabel: { fontSize: 9, fontWeight: "700", color: "#d4725c" },
  dayLabelToday: { color: "rgba(255,255,255,0.95)" },
  dateNum: { fontSize: 24, fontWeight: "900", color: "#4a3f36" },
  dateNumToday: { color: "#fff" },
  menuSection: { flex: 1, padding: 10, paddingLeft: 14, justifyContent: "center", gap: 6 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#fff7ef", borderRadius: 20, borderWidth: 1, borderColor: "rgba(232,149,110,0.2)" },
  chipArchive: { backgroundColor: "#f8f4ef", borderColor: "rgba(200,180,160,0.15)" },
  chipText: { fontSize: 13, fontWeight: "500", color: "#5a4a3c" },

  addModeSelect: { flexDirection: "row", gap: 6, alignItems: "center" },
  modeBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: "#fff7ef", borderRadius: 12, borderWidth: 1, borderColor: "rgba(232,149,110,0.25)" },
  modeCancelBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", backgroundColor: "#f5ebe2", borderRadius: 8, marginLeft: "auto" },
  addBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1.5, borderColor: "#ddc8b4", borderRadius: 20, borderStyle: "dashed", alignSelf: "flex-start" },
  addBtnEmpty: { paddingVertical: 8, paddingHorizontal: 16 },
  recipePickerItem: { padding: 10, backgroundColor: "#fff7ef", borderRadius: 10, borderWidth: 1, borderColor: "rgba(232,149,110,0.15)", marginBottom: 4 },

  mealsEmptyHint: { alignItems: "center", padding: 20, paddingVertical: 24, marginBottom: 10, backgroundColor: "#fffcf8", borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(220,200,180,0.5)", borderStyle: "dashed" },

  // ── 今日のごはん ヒーローカード ──
  hero: { position: "relative", overflow: "hidden", backgroundColor: "#fff7ef", borderRadius: 22, padding: 16, paddingBottom: 18, borderWidth: 2, borderColor: "#e8956e", marginBottom: 14, shadowColor: "#d4725c", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 5 },
  heroSwapActive: { borderColor: "#5a8a4a", backgroundColor: "rgba(90,138,74,0.1)" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  heroTag: { fontSize: 15, fontWeight: "900", color: "#c0563f", letterSpacing: 0.5 },
  heroDate: { marginLeft: "auto", backgroundColor: "#d4725c", paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20 },
  heroDateText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  heroMeals: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  heroMeal: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: "rgba(232,149,110,0.3)", shadowColor: "#b4785a", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 },
  heroMealName: { fontSize: 15, fontWeight: "700", color: "#4a3f36" },
  heroEmpty: { fontSize: 13, color: "#b8a594", fontStyle: "italic", marginBottom: 12 },
  heroAdd: { paddingVertical: 11, backgroundColor: "#d4725c", borderRadius: 12, alignItems: "center" },
  heroAddText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  heroSwapHint: { paddingVertical: 11, backgroundColor: "rgba(90,138,74,0.15)", borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(90,138,74,0.4)" },
  heroCancelSwap: { paddingVertical: 8, alignItems: "center" },

  // ── ノート風の区切り / 綴じ線 ──
  nbDivider: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2, marginBottom: 12, paddingHorizontal: 2 },
  nbDividerLine: { flex: 1, height: 1.5, backgroundColor: "rgba(201,168,140,0.5)", borderRadius: 1 },
  nbDividerLabel: { fontSize: 11, fontWeight: "700", color: "#a09585", letterSpacing: 1 },
  nlist: { position: "relative", paddingLeft: 14 },
  nlistBindLine: { position: "absolute", left: 4, top: 6, bottom: 6, width: 2, backgroundColor: "rgba(232,149,110,0.35)", borderRadius: 2 },

  archiveToggle: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, paddingHorizontal: 16, backgroundColor: "rgba(180,165,148,0.1)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(180,165,148,0.2)" },
  archiveBadge: { marginLeft: "auto", backgroundColor: "rgba(201,168,140,0.15)", paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },

  // Recipe tab
  newRecipeBtn: { alignItems: "center", padding: 14, backgroundColor: "#fff7ef", borderRadius: 14, borderWidth: 1.5, borderColor: "#e8c8ae", borderStyle: "dashed", marginBottom: 8 },
  webSearchBtn: { alignItems: "center", padding: 14, backgroundColor: "#4a7ab5", borderRadius: 14, marginBottom: 12 },
  recipeSearchBox: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: "#fffaf5", borderRadius: 12, borderWidth: 1.5, borderColor: "#e8c8ae", marginBottom: 12 },
  recipeSearchInput: { flex: 1, fontSize: 14, color: "#4a3f36", paddingVertical: 8 },
  recipeCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: "#fffcf8", borderRadius: 14, borderWidth: 1, borderColor: "rgba(220,200,180,0.3)", marginBottom: 8 },
  recipeCardLeft: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#fff7ef", alignItems: "center", justifyContent: "center" },
  recipeAddMealBtn: { paddingVertical: 5, paddingHorizontal: 10, backgroundColor: "#d4725c", borderRadius: 7 },
  recipeEditBtn: { paddingVertical: 5, paddingHorizontal: 10, backgroundColor: "#f5ebe2", borderRadius: 7, alignItems: "center" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fffcf8", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#4a3f36" },
  closeX: { fontSize: 22, color: "#a08979", width: 32, height: 32, textAlign: "center", lineHeight: 32, backgroundColor: "#f5ebe2", borderRadius: 10, overflow: "hidden" },

  // Buttons
  primaryBtn: { padding: 12, backgroundColor: "#d4725c", borderRadius: 10, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  closeBtn: { padding: 12, backgroundColor: "#f5ebe2", borderRadius: 10, alignItems: "center" },
  closeBtnText: { color: "#8a7e72", fontWeight: "600", fontSize: 14 },
  dangerBtn: { padding: 12, backgroundColor: "#fdeeed", borderRadius: 10, alignItems: "center" },
  dangerBtnText: { color: "#c0564e", fontWeight: "500", fontSize: 12 },
  promoteBtn: { padding: 12, backgroundColor: "#5f9e7a", borderRadius: 10, alignItems: "center", marginTop: 8 },
  promoteBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  saveBtn: { padding: 10, backgroundColor: "#d4725c", borderRadius: 8, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  cancelBtn: { padding: 5, paddingHorizontal: 12, backgroundColor: "#f5ebe2", borderRadius: 8 },
  cancelBtnText: { color: "#a08979", fontSize: 11 },
  formBackBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#f5ebe2", borderRadius: 8 },

  // Form
  formLabel: { fontSize: 12, fontWeight: "600", color: "#8a7e72", marginBottom: 6, marginTop: 14 },
  formCard: { backgroundColor: "#fffcf8", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "rgba(220,200,180,0.3)" },
  input: { padding: 10, paddingHorizontal: 14, fontSize: 14, borderWidth: 1.5, borderColor: "#e8c8ae", borderRadius: 12, backgroundColor: "#fffaf5", color: "#4a3f36" },

  // Recipe detail
  sectionLabel: { fontSize: 14, fontWeight: "700", color: "#6a5d50", marginBottom: 8 },
  ingItem: { padding: 8, paddingHorizontal: 12, backgroundColor: "#fff7ef", borderRadius: 10, borderWidth: 1, borderColor: "rgba(232,149,110,0.12)", marginBottom: 4 },
  stepItem: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 8, paddingHorizontal: 12, backgroundColor: "#faf7f2", borderRadius: 10, marginBottom: 6 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#d4725c", alignItems: "center", justifyContent: "center" },
  stepNumSmall: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#d4725c", alignItems: "center", justifyContent: "center" },
  urlLink: { padding: 10, paddingHorizontal: 14, backgroundColor: "#f0f7ff", borderRadius: 10, borderWidth: 1, borderColor: "rgba(74,122,181,0.15)" },

  // Date picker
  datePickerItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, paddingHorizontal: 14, backgroundColor: "#fffcf8", borderRadius: 12, borderWidth: 1, borderColor: "rgba(220,200,180,0.3)", marginBottom: 4 },
  datePickerItemToday: { backgroundColor: "#fff7ef", borderColor: "#e8956e", borderWidth: 1.5 },

  // COOP
  coopOrderInfo: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, backgroundColor: "#fffcf8", borderRadius: 14, borderWidth: 1, borderColor: "rgba(220,200,180,0.3)", marginBottom: 12 },
  refreshBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: "#f5ebe2", borderRadius: 10 },
  coopCatSection: { backgroundColor: "#fffcf8", borderRadius: 14, borderWidth: 1, borderColor: "rgba(220,200,180,0.3)", marginBottom: 8, overflow: "hidden" },
  coopCatHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, paddingHorizontal: 14 },
  coopCatLabel: { fontSize: 14, fontWeight: "700" },
  coopSelBadge: { backgroundColor: "rgba(212,114,92,0.1)", paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  selectAllBtn: { paddingVertical: 6, paddingHorizontal: 14, marginHorizontal: 14, marginBottom: 8, backgroundColor: "#f5ebe2", borderRadius: 8, alignSelf: "flex-start" },
  coopItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, paddingHorizontal: 12, marginHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: "transparent", marginBottom: 2 },
  coopItemSel: { backgroundColor: "#fff7ef", borderColor: "rgba(232,149,110,0.2)" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#ddc8b4", alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: "#d4725c", borderColor: "transparent" },
  coopActionBar: { padding: 14, paddingBottom: 20, backgroundColor: "#f0e5d8", borderTopWidth: 1, borderTopColor: "rgba(220,200,180,0.3)" },
  coopActionBtn: { padding: 12, backgroundColor: "#d4725c", borderRadius: 10, alignItems: "center" },
  planAllBtn: { padding: 12, backgroundColor: "#5a8a4a", borderRadius: 10, alignItems: "center" },
  planDayBtn: { padding: 10, backgroundColor: "#5a8a4a", borderRadius: 10, alignItems: "center" },
  googleBtn: { padding: 10, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "rgba(74,122,181,0.3)", borderRadius: 10, alignItems: "center" },
  coopRecipeCard: { backgroundColor: "#fffcf8", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "rgba(220,200,180,0.3)" },
  coopInfoBox: { padding: 8, paddingHorizontal: 12, backgroundColor: "rgba(180,165,148,0.08)", borderRadius: 10, marginBottom: 12 },
  ingTagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 8 },
  ingTag: { paddingVertical: 3, paddingHorizontal: 8, backgroundColor: "#fff7ef", borderRadius: 12, borderWidth: 1, borderColor: "rgba(232,149,110,0.15)" },
  dayBadge: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#5a8a4a", borderRadius: 10, alignItems: "center" },

  // Recipe category filter chips
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, backgroundColor: "#fff7ef", borderRadius: 20, borderWidth: 1, borderColor: "rgba(232,149,110,0.25)" },
  filterChipActive: { backgroundColor: "#d4725c", borderColor: "transparent" },
  filterChipText: { fontSize: 13, fontWeight: "500", color: "#8a7e72" },
  filterChipTextActive: { color: "#fff", fontWeight: "700" },

  // Category labels on recipe cards
  catLabel: { paddingVertical: 2, paddingHorizontal: 8, backgroundColor: "#fff7ef", borderRadius: 10, borderWidth: 1, borderColor: "rgba(232,149,110,0.2)" },
  catLabelText: { fontSize: 10, fontWeight: "600", color: "#d4725c" },

  // Category management in form
  catRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#fffcf8", borderRadius: 10, borderWidth: 1, borderColor: "rgba(220,200,180,0.25)", marginBottom: 4 },
  catCheckWrap: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#ddc8b4", alignItems: "center", justifyContent: "center" },
  catCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#ddc8b4", alignItems: "center", justifyContent: "center" },
  catCheckOn: { backgroundColor: "#d4725c", borderColor: "transparent" },
  catEditBtn: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: "#f5ebe2", borderRadius: 7 },
  catDeleteBtn: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: "#fdeeed", borderRadius: 7 },
  catSaveBtn: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: "#d4725c", borderRadius: 7 },
  catCancelBtn: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: "#f5ebe2", borderRadius: 7 },
  catAddBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#fff7ef", borderRadius: 10, borderWidth: 1.5, borderColor: "#ddc8b4", borderStyle: "dashed", alignSelf: "flex-start", marginTop: 4 },
  catManageBtn: { paddingVertical: 4, paddingHorizontal: 10, backgroundColor: "#f5ebe2", borderRadius: 8, borderWidth: 1, borderColor: "rgba(220,200,180,0.4)" },
});

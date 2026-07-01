import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Household, AppUser } from "../types";
import { PendingInvite } from "../hooks/useHousehold";
import { getCoopConfig, getWebApiUrl, setCoopToken, setCoopUrl, setWebApiUrl, getDefaultApiSettings } from "../config/coopConfig";

// ─── 招待バナー（設定タブ・グループ未所属画面の両方で使用） ──────────────────────
type InviteBannerProps = {
  invite: PendingInvite;
  onJoin: () => Promise<void>;
  onDecline: () => Promise<void>;
};

export function InviteBanner({ invite, onJoin, onDecline }: InviteBannerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (fn: () => Promise<void>): Promise<void> => {
    setLoading(true); setError(null);
    try { await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : "エラーが発生しました"); }
    finally { setLoading(false); }
  };

  return (
    <View style={s.inviteCard}>
      <Text style={s.inviteTitle}>📨 グループへの招待</Text>
      <Text style={s.inviteText}>「{invite.householdName}」グループに招待されています。</Text>
      {error && <Text style={s.errorText}>{error}</Text>}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <TouchableOpacity
          style={[s.primaryBtn, { flex: 1 }, loading && s.btnDisabled]}
          onPress={() => handle(onJoin)}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>参加する</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.closeBtn, loading && s.btnDisabled]}
          onPress={() => handle(onDecline)}
          disabled={loading}
        >
          <Text style={s.closeBtnText}>断る</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── グループ作成 / 参加画面 ─────────────────────────────────────────────────────
type HouseholdSetupScreenProps = {
  user: AppUser;
  pendingInvite: PendingInvite | null;
  onCreateHousehold: (name: string) => Promise<void>;
  onJoinHousehold: (invite: PendingInvite) => Promise<void>;
  onDeclineInvite: () => Promise<void>;
  onLogout: () => void;
};

export function HouseholdSetupScreen({
  user,
  pendingInvite,
  onCreateHousehold,
  onJoinHousehold,
  onDeclineInvite,
  onLogout,
}: HouseholdSetupScreenProps) {
  const [householdName, setHouseholdName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (): Promise<void> => {
    const name = householdName.trim();
    if (!name) return;
    setLoading(true); setError(null);
    try { await onCreateHousehold(name); }
    catch (e) { setError("作成に失敗しました: " + (e instanceof Error ? e.message : String(e))); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAwareScrollView contentContainerStyle={s.inner} enableOnAndroid extraScrollHeight={16}>
          <Text style={s.logoEmoji}>🏠</Text>
          <Text style={s.title}>グループ設定</Text>
          <Text style={s.userLabel}>{user.email} でログイン中</Text>

          {/* 招待がある場合 */}
          {pendingInvite && (
            <InviteBanner
              invite={pendingInvite}
              onJoin={() => onJoinHousehold(pendingInvite)}
              onDecline={onDeclineInvite}
            />
          )}

          {/* グループ新規作成 */}
          <View style={s.createCard}>
            <Text style={s.cardTitle}>
              {pendingInvite ? "または新しく作成" : "グループを作成"}
            </Text>
            <Text style={s.cardDesc}>
              家族のグループ名を入力してください。{"\n"}（例：〇〇家の献立）
            </Text>
            <TextInput
              style={s.input}
              value={householdName}
              onChangeText={setHouseholdName}
              placeholder="グループ名"
              placeholderTextColor="#c9a88c"
              editable={!loading}
            />
            <TouchableOpacity
              style={[s.primaryBtn, (!householdName.trim() || loading) && s.btnDisabled]}
              onPress={handleCreate}
              disabled={!householdName.trim() || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>作成する</Text>}
            </TouchableOpacity>
          </View>

          {error && <Text style={s.errorText}>{error}</Text>}

          <TouchableOpacity onPress={onLogout} style={s.logoutBtn}>
            <Text style={s.logoutText}>ログアウト</Text>
          </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

// ─── 設定タブ内のグループ管理パネル ────────────────────────────────────────────
type HouseholdSettingsPanelProps = {
  household: Household;
  user: AppUser;
  pendingInvite: PendingInvite | null;
  onInvite: (email: string) => Promise<void>;
  onJoinHousehold: (invite: PendingInvite) => Promise<void>;
  onDeclineInvite: () => Promise<void>;
  onLogout: () => void;
  children?: React.ReactNode;
};

export function HouseholdSettingsPanel({
  household,
  user,
  pendingInvite,
  onInvite,
  onJoinHousehold,
  onDeclineInvite,
  onLogout,
  children,
}: HouseholdSettingsPanelProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvite = async (): Promise<void> => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviting(true); setError(null); setInviteSuccess(false);
    try {
      await onInvite(email);
      setInviteEmail("");
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (e) {
      setError("招待に失敗しました: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setInviting(false);
    }
  };

  return (
    <View style={s.settingsPanel}>
      {/* 招待バナー（別グループへの招待が届いている場合） */}
      {pendingInvite && (
        <InviteBanner
          invite={pendingInvite}
          onJoin={() => onJoinHousehold(pendingInvite)}
          onDecline={onDeclineInvite}
        />
      )}

      <Text style={s.sectionTitle}>👥 グループ情報</Text>
      <View style={s.infoRow}>
        <Text style={s.infoLabel}>グループ名</Text>
        <Text style={s.infoValue}>{household.name}</Text>
      </View>
      <View style={s.infoRow}>
        <Text style={s.infoLabel}>メンバー数</Text>
        <Text style={s.infoValue}>{household.members.length}人</Text>
      </View>
      <View style={s.infoRow}>
        <Text style={s.infoLabel}>ログイン中</Text>
        <Text style={s.infoValue}>{user.email}</Text>
      </View>

      {/* 招待 */}
      <Text style={[s.sectionTitle, { marginTop: 20 }]}>📨 メンバーを招待</Text>
      <Text style={s.cardDesc}>
        相手のメールアドレスを入力してください。{"\n"}
        相手がアプリを開くと招待通知が届きます。
      </Text>
      <TextInput
        style={s.input}
        value={inviteEmail}
        onChangeText={setInviteEmail}
        placeholder="例：someone@gmail.com"
        placeholderTextColor="#c9a88c"
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!inviting}
      />
      <TouchableOpacity
        style={[s.primaryBtn, (!inviteEmail.trim() || inviting) && s.btnDisabled]}
        onPress={handleInvite}
        disabled={!inviteEmail.trim() || inviting}
      >
        {inviting ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>招待する</Text>}
      </TouchableOpacity>
      {inviteSuccess && <Text style={s.successText}>招待を送信しました ✓</Text>}
      {error && <Text style={s.errorText}>{error}</Text>}

      {/* 保留中の招待 */}
      {household.invites.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { marginTop: 20 }]}>⏳ 招待待ち</Text>
          {household.invites.map((inv, i) => (
            <View key={i} style={s.pendingInviteRow}>
              <Text style={s.pendingInviteEmail}>{inv.email}</Text>
            </View>
          ))}
        </>
      )}

      {children}

      <TouchableOpacity onPress={onLogout} style={[s.logoutBtn, { marginTop: 32 }]}>
        <Text style={s.logoutText}>ログアウト</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── 設定タブ内のAPI設定パネル（上級者向け・折りたたみ） ──────────────────────────
export function ApiSettingsPanel() {
  const [coopUrl, setCoopUrlState] = useState("");
  const [coopToken, setCoopTokenState] = useState("");
  const [webUrl, setWebUrlState] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { url, token } = await getCoopConfig();
        const w = await getWebApiUrl();
        setCoopUrlState(url);
        setCoopTokenState(token);
        setWebUrlState(w);
      } catch {
        /* SecureStore未対応環境などは無視（初期値のまま） */
      }
    })();
  }, []);

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setSavedMsg(null);
    try {
      await setCoopUrl(coopUrl.trim());
      await setCoopToken(coopToken.trim());
      await setWebApiUrl(webUrl.trim());
      setSavedMsg("保存しました ✓");
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (e) {
      setSavedMsg("保存に失敗しました: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (): void => {
    const d = getDefaultApiSettings();
    setCoopUrlState(d.coopUrl);
    setCoopTokenState(d.coopToken);
    setWebUrlState(d.webUrl);
    setSavedMsg(null);
  };

  return (
    <View style={{ marginTop: 16 }}>
      <TouchableOpacity onPress={() => setOpen((o) => !o)} style={s.apiToggle} activeOpacity={0.7}>
        <Text style={s.sectionTitle}>🔧 API設定（上級者向け）</Text>
        <Text style={{ marginLeft: "auto", color: "#a09585", fontSize: 14 }}>{open ? "▾" : "▸"}</Text>
      </TouchableOpacity>

      {open && (
        <View style={{ gap: 8 }}>
          <Text style={s.cardDesc}>
            COOP連携サーバーやWEB検索APIの接続先を変更できます。{"\n"}通常は変更不要です。
          </Text>

          <Text style={s.apiLabel}>COOP API URL</Text>
          <TextInput
            style={s.input}
            value={coopUrl}
            onChangeText={setCoopUrlState}
            placeholder="https://..."
            placeholderTextColor="#c9a88c"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!saving}
          />

          <Text style={s.apiLabel}>COOP API トークン</Text>
          <View>
            <TextInput
              style={[s.input, { paddingRight: 60 }]}
              value={coopToken}
              onChangeText={setCoopTokenState}
              placeholder="トークン"
              placeholderTextColor="#c9a88c"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showToken}
              editable={!saving}
            />
            <TouchableOpacity style={s.tokenToggle} onPress={() => setShowToken((v) => !v)}>
              <Text style={{ fontSize: 12, color: "#8a7e72" }}>{showToken ? "隠す" : "表示"}</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.apiLabel}>WEB検索 API URL</Text>
          <TextInput
            style={s.input}
            value={webUrl}
            onChangeText={setWebUrlState}
            placeholder="https://..."
            placeholderTextColor="#c9a88c"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!saving}
          />

          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            <TouchableOpacity
              style={[s.primaryBtn, { flex: 1 }, saving && s.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>保存する</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.closeBtn, saving && s.btnDisabled]} onPress={handleReset} disabled={saving}>
              <Text style={s.closeBtnText}>初期値に戻す</Text>
            </TouchableOpacity>
          </View>
          {savedMsg && (
            <Text style={savedMsg.includes("✓") ? s.successText : s.errorText}>{savedMsg}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf5ef" },
  inner: { alignItems: "center", padding: 24, paddingBottom: 48, gap: 20 },
  logoEmoji: { fontSize: 56 },
  title: { fontSize: 24, fontWeight: "800", color: "#4a3f36" },
  userLabel: { fontSize: 12, color: "#a08979" },

  inviteCard: {
    width: "100%",
    backgroundColor: "#fff7ef",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#e8956e",
    gap: 6,
  },
  inviteTitle: { fontSize: 16, fontWeight: "700", color: "#d4725c" },
  inviteText: { fontSize: 14, color: "#4a3f36", lineHeight: 20 },

  createCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(220,200,180,0.4)",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#4a3f36" },
  cardDesc: { fontSize: 13, color: "#a08979", lineHeight: 18 },
  input: {
    padding: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: "#e8c8ae",
    borderRadius: 12,
    backgroundColor: "#fffaf5",
    color: "#4a3f36",
  },
  primaryBtn: {
    padding: 13,
    backgroundColor: "#d4725c",
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  closeBtn: {
    padding: 13,
    backgroundColor: "#f5ebe2",
    borderRadius: 12,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  closeBtnText: { color: "#8a7e72", fontWeight: "600", fontSize: 14 },
  btnDisabled: { opacity: 0.45 },

  errorText: { fontSize: 13, color: "#c0564e", textAlign: "center" },
  successText: { fontSize: 13, color: "#5a8a4a", textAlign: "center" },
  logoutBtn: { paddingVertical: 8 },
  logoutText: { fontSize: 13, color: "#a08979" },

  settingsPanel: { padding: 16, gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#4a3f36", marginBottom: 4 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fffcf8",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(220,200,180,0.3)",
  },
  infoLabel: { fontSize: 13, color: "#a08979" },
  infoValue: { fontSize: 13, color: "#4a3f36", fontWeight: "600", flexShrink: 1, textAlign: "right" },
  pendingInviteRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fffcf8",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(220,200,180,0.3)",
  },
  pendingInviteEmail: { fontSize: 13, color: "#a08979" },

  apiToggle: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  apiLabel: { fontSize: 12, fontWeight: "600", color: "#8a7e72", marginTop: 6 },
  tokenToggle: { position: "absolute", right: 6, top: 0, bottom: 0, justifyContent: "center", paddingHorizontal: 8 },
});

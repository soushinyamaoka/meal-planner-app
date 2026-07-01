import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

type LoginScreenProps = {
  onSignIn: (email: string, password: string) => void;
  onSignUp: (email: string, password: string, displayName: string) => void;
  onResetPassword: (email: string) => void;
  authLoading: boolean;
  error: string | null;
  onClearError: () => void;
};

type Mode = "login" | "signup" | "reset";

export default function LoginScreen({
  onSignIn,
  onSignUp,
  onResetPassword,
  authLoading,
  error,
  onClearError,
}: LoginScreenProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const switchMode = (next: Mode): void => {
    setMode(next);
    setResetSent(false);
    onClearError();
  };

  const handleSubmit = (): void => {
    if (mode === "login") {
      onSignIn(email, password);
    } else if (mode === "signup") {
      onSignUp(email, password, displayName);
    } else {
      onResetPassword(email);
      setResetSent(true);
    }
  };

  const isReady = (): boolean => {
    if (mode === "reset") return email.trim().length > 0;
    if (mode === "signup") return email.trim().length > 0 && password.length >= 6 && displayName.trim().length > 0;
    return email.trim().length > 0 && password.length > 0;
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAwareScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled" enableOnAndroid extraScrollHeight={16}>
          {/* ロゴ */}
          <View style={s.logoWrap}>
            <Text style={s.logoEmoji}>🍽️</Text>
            <Text style={s.title}>献立ノート</Text>
            <Text style={s.subtitle}>家族で共有できる献立・レシピ管理</Text>
          </View>

          {/* フォーム */}
          <View style={s.formCard}>
            <Text style={s.formTitle}>
              {mode === "login" ? "ログイン" : mode === "signup" ? "アカウント登録" : "パスワードをリセット"}
            </Text>

            {/* 名前（登録時のみ） */}
            {mode === "signup" && (
              <View style={s.fieldWrap}>
                <Text style={s.label}>お名前</Text>
                <TextInput
                  style={s.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="例：山田太郎"
                  placeholderTextColor="#c9a88c"
                  autoCapitalize="none"
                  editable={!authLoading}
                />
              </View>
            )}

            {/* メールアドレス */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>メールアドレス</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="example@gmail.com"
                placeholderTextColor="#c9a88c"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!authLoading}
              />
            </View>

            {/* パスワード（リセット以外） */}
            {mode !== "reset" && (
              <View style={s.fieldWrap}>
                <Text style={s.label}>パスワード{mode === "signup" ? "（6文字以上）" : ""}</Text>
                <TextInput
                  style={s.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="パスワード"
                  placeholderTextColor="#c9a88c"
                  secureTextEntry
                  editable={!authLoading}
                />
              </View>
            )}

            {/* エラー */}
            {error && <Text style={s.errorText}>{error}</Text>}

            {/* リセット送信完了 */}
            {resetSent && !error && (
              <Text style={s.successText}>リセットメールを送信しました。メールをご確認ください。</Text>
            )}

            {/* ボタン */}
            <TouchableOpacity
              style={[s.primaryBtn, (!isReady() || authLoading) && s.btnDisabled]}
              onPress={handleSubmit}
              disabled={!isReady() || authLoading}
            >
              {authLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryBtnText}>
                  {mode === "login" ? "ログイン" : mode === "signup" ? "登録する" : "リセットメールを送信"}
                </Text>
              )}
            </TouchableOpacity>

            {/* パスワード忘れ（ログイン時のみ） */}
            {mode === "login" && (
              <TouchableOpacity style={s.linkBtn} onPress={() => switchMode("reset")}>
                <Text style={s.linkText}>パスワードを忘れた場合</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* モード切替 */}
          <View style={s.switchWrap}>
            {mode === "login" ? (
              <>
                <Text style={s.switchLabel}>アカウントをお持ちでない方</Text>
                <TouchableOpacity onPress={() => switchMode("signup")}>
                  <Text style={s.switchLink}>新規登録はこちら</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={() => switchMode("login")}>
                <Text style={s.switchLink}>← ログインに戻る</Text>
              </TouchableOpacity>
            )}
          </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf5ef" },
  inner: { alignItems: "center", padding: 24, paddingBottom: 48, gap: 28 },
  logoWrap: { alignItems: "center", gap: 8, paddingTop: 20 },
  logoEmoji: { fontSize: 64 },
  title: { fontSize: 30, fontWeight: "900", color: "#4a3f36", letterSpacing: 2 },
  subtitle: { fontSize: 13, color: "#a08979", textAlign: "center" },

  formCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(220,200,180,0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  formTitle: { fontSize: 18, fontWeight: "800", color: "#4a3f36", marginBottom: 4 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 12, fontWeight: "600", color: "#8a7e72" },
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
    padding: 14,
    backgroundColor: "#d4725c",
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnDisabled: { opacity: 0.45 },

  linkBtn: { alignItems: "center", paddingVertical: 4 },
  linkText: { fontSize: 12, color: "#a08979" },

  errorText: { fontSize: 13, color: "#c0564e", textAlign: "center" },
  successText: { fontSize: 13, color: "#5a8a4a", textAlign: "center", lineHeight: 18 },

  switchWrap: { alignItems: "center", gap: 4 },
  switchLabel: { fontSize: 12, color: "#a08979" },
  switchLink: { fontSize: 13, color: "#d4725c", fontWeight: "600" },
});

import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import { AppUser } from "../types";

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? "",
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    setAuthLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setAuthLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName: string): Promise<void> => {
    setAuthLoading(true);
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const trimmedName = displayName.trim();
      if (trimmedName) {
        await updateProfile(result.user, { displayName: trimmedName });
        // onAuthStateChangedはupdateProfile前に発火しているため、手動でstateを更新
        setUser({
          uid: result.user.uid,
          email: result.user.email ?? "",
          displayName: trimmedName,
          photoURL: result.user.photoURL,
        });
      }
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setAuthLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    setAuthLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = (): Promise<void> => signOut(auth);

  return { user, loading, authLoading, error, setError, signIn, signUp, resetPassword, logout };
}

function toMessage(e: unknown): string {
  const code = (e as { code?: string })?.code;
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "メールアドレスまたはパスワードが正しくありません";
    case "auth/email-already-in-use":
      return "このメールアドレスは既に登録されています";
    case "auth/weak-password":
      return "パスワードは6文字以上にしてください";
    case "auth/invalid-email":
      return "メールアドレスの形式が正しくありません";
    case "auth/too-many-requests":
      return "試行回数が多すぎます。しばらく後に再試行してください";
    default:
      return e instanceof Error ? e.message : "エラーが発生しました";
  }
}

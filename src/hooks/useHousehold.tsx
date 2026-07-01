import { useState, useEffect } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { Household, HouseholdInvite, AppUser } from "../types";

const USERS_COL = "users";
const HOUSEHOLDS_COL = "households";
const INVITES_COL = "invites"; // invites/{email} でリアルタイム検索可能にする

type UserDoc = {
  householdId?: string;
  email: string;
  displayName: string | null;
};

export type PendingInvite = {
  householdId: string;
  householdName: string;
  invitedBy: string;
  invitedAt: string;
};

export function useHousehold(user: AppUser | null) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loadingHousehold, setLoadingHousehold] = useState(true);
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setHousehold(null);
      setPendingInvite(null);
      setLoadingHousehold(false);
      setLoadError(null);
      return;
    }

    let unsubHousehold: (() => void) | null = null;
    let unsubInvite: (() => void) | null = null;

    const init = async () => {
      setLoadingHousehold(true);
      setLoadError(null);
      try {
        // ユーザードキュメントの確認・作成
        const userRef = doc(db, USERS_COL, user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName,
          } satisfies UserDoc);
        } else {
          // displayNameがauth側にあるがusers側にない場合は補完（signUp直後のケース）
          const existing = userSnap.data() as UserDoc;
          if (user.displayName && !existing.displayName) {
            await setDoc(userRef, { displayName: user.displayName }, { merge: true });
          }
        }

        const userDoc = userSnap.exists() ? (userSnap.data() as UserDoc) : null;
        const householdId = userDoc?.householdId;

        // household をリアルタイム監視
        if (householdId) {
          const householdRef = doc(db, HOUSEHOLDS_COL, householdId);
          unsubHousehold = onSnapshot(
            householdRef,
            (snap) => {
              if (snap.exists()) {
                setHousehold({ id: snap.id, ...snap.data() } as Household);
              }
              setLoadingHousehold(false);
            },
            (err) => {
              console.error("[useHousehold] household snapshot error:", err);
              setLoadError("グループ情報の取得に失敗しました");
              setLoadingHousehold(false);
            }
          );
        } else {
          setLoadingHousehold(false);
        }

        // 招待をリアルタイム監視（グループ所属済みでも常に監視）
        const inviteRef = doc(db, INVITES_COL, user.email);
        unsubInvite = onSnapshot(
          inviteRef,
          (snap) => {
            if (snap.exists()) {
              setPendingInvite(snap.data() as PendingInvite);
            } else {
              setPendingInvite(null);
            }
          },
          (err) => {
            // 招待監視の失敗は致命的ではない（招待の検知ができないだけ）
            console.error("[useHousehold] invite snapshot error:", err);
          }
        );
      } catch (e) {
        console.error("[useHousehold] init failed:", e);
        setLoadError("初期化に失敗しました: " + (e instanceof Error ? e.message : String(e)));
        setLoadingHousehold(false);
      }
    };

    init();
    return () => {
      unsubHousehold?.();
      unsubInvite?.();
    };
  }, [user]);

  /** 新しいhouseholdを作成 */
  const createHousehold = async (name: string): Promise<void> => {
    if (!user) return;
    const householdRef = doc(collection(db, HOUSEHOLDS_COL));
    const newHousehold: Omit<Household, "id"> = {
      name,
      members: [user.uid],
      invites: [],
    };
    await setDoc(householdRef, newHousehold);
    await setDoc(doc(db, USERS_COL, user.uid), { householdId: householdRef.id }, { merge: true });
    setHousehold({ id: householdRef.id, ...newHousehold });
  };

  /** 招待を承認してhouseholdに参加（既存グループから移動） */
  const joinHousehold = async (invite: PendingInvite): Promise<void> => {
    if (!user) return;

    // 1. 新グループの存在を確認（失敗したら何もせず終了）
    const newHouseholdRef = doc(db, HOUSEHOLDS_COL, invite.householdId);
    const newHouseholdSnap = await getDoc(newHouseholdRef);
    if (!newHouseholdSnap.exists()) throw new Error("グループが見つかりません");

    const newHouseholdData = { id: newHouseholdSnap.id, ...newHouseholdSnap.data() } as Household;
    const myInvite = newHouseholdData.invites.find((inv) => inv.email === user.email);

    // 2. 新グループに参加（members追加 + 自分の招待のみarrayRemove）
    const updates: Record<string, unknown> = {
      members: arrayUnion(user.uid),
    };
    if (myInvite) {
      updates.invites = arrayRemove(myInvite);
    }
    await updateDoc(newHouseholdRef, updates);

    // 3. ユーザードキュメントを新グループに更新
    await setDoc(doc(db, USERS_COL, user.uid), { householdId: invite.householdId }, { merge: true });

    // 4. 旧グループから脱退（失敗しても新グループには所属済みなので致命的ではない）
    if (household && household.id !== invite.householdId) {
      try {
        const currentRef = doc(db, HOUSEHOLDS_COL, household.id);
        await updateDoc(currentRef, {
          members: arrayRemove(user.uid),
        });
      } catch (e) {
        console.error("Failed to remove from old household:", e);
      }
    }

    // 5. 招待ドキュメントを削除（失敗しても致命的ではない）
    try {
      await deleteDoc(doc(db, INVITES_COL, user.email));
    } catch (e) {
      console.error("Failed to delete invite doc:", e);
    }

    const mergedMembers = newHouseholdData.members.includes(user.uid)
      ? newHouseholdData.members
      : [...newHouseholdData.members, user.uid];
    setHousehold({
      ...newHouseholdData,
      members: mergedMembers,
      invites: myInvite ? newHouseholdData.invites.filter((inv) => inv !== myInvite) : newHouseholdData.invites,
    });
    setPendingInvite(null);
  };

  /** 招待を拒否 */
  const declineInvite = async (): Promise<void> => {
    if (!user) return;

    // 招待元のhousehold.invitesから自分のemailを削除
    if (pendingInvite) {
      try {
        const householdRef = doc(db, HOUSEHOLDS_COL, pendingInvite.householdId);
        const householdSnap = await getDoc(householdRef);
        if (householdSnap.exists()) {
          const householdData = householdSnap.data() as Household;
          const updatedInvites = householdData.invites.filter(
            (inv) => inv.email !== user.email
          );
          await updateDoc(householdRef, { invites: updatedInvites });
        }
      } catch (e) {
        // households側の更新に失敗しても招待ドキュメントの削除は継続する
        console.error("Failed to update household invites on decline:", e);
      }
    }

    await deleteDoc(doc(db, INVITES_COL, user.email));
    setPendingInvite(null);
  };

  /** メールアドレスで招待を送信 */
  const inviteByEmail = async (email: string): Promise<void> => {
    if (!user || !household) return;
    const normalizedEmail = email.trim().toLowerCase();

    // 自分自身は招待できない
    if (normalizedEmail === user.email.toLowerCase()) {
      throw new Error("自分自身は招待できません。");
    }

    // 同グループ内に既に招待中のemailか確認
    const alreadyInvited = household.invites.some(
      (inv) => inv.email.toLowerCase() === normalizedEmail
    );
    if (alreadyInvited) {
      throw new Error("このメールアドレスは既に招待済みです。");
    }

    // 別グループから招待が残っていないか確認
    const existingInviteSnap = await getDoc(doc(db, INVITES_COL, normalizedEmail));
    if (existingInviteSnap.exists()) {
      const existing = existingInviteSnap.data() as PendingInvite;
      if (existing.householdId !== household.id) {
        throw new Error("このメールアドレスには既に別グループからの招待が送られています。");
      }
    }

    const invite: HouseholdInvite = {
      email: normalizedEmail,
      invitedBy: user.uid,
      invitedAt: new Date().toISOString(),
    };

    // households/{id}/invites に追加
    const householdRef = doc(db, HOUSEHOLDS_COL, household.id);
    await updateDoc(householdRef, {
      invites: arrayUnion(invite),
    });

    // invites/{email} にも書き込み（リアルタイム検索用）
    await setDoc(doc(db, INVITES_COL, normalizedEmail), {
      householdId: household.id,
      householdName: household.name,
      invitedBy: user.uid,
      invitedAt: new Date().toISOString(),
    } satisfies PendingInvite);
  };

  return {
    household,
    loadingHousehold,
    pendingInvite,
    loadError,
    createHousehold,
    joinHousehold,
    declineInvite,
    inviteByEmail,
  };
}

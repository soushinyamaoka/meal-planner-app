import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { NurseryMenus } from "../types";

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isValidDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() + 1 === month
    && date.getUTCDate() === day;
}

/**
 * 保育園献立(households/{householdId}/nurseryMenus)をFirestoreとリアルタイム同期するHook
 *
 * 書き込みはscripts/importNurseryMenu.mjsのみが行う。アプリ側は読み取り専用。
 */
export function useNurseryMenus(householdId: string | null) {
  const [nurseryMenus, setNurseryMenus] = useState<NurseryMenus>({});
  const [loadingNurseryMenus, setLoadingNurseryMenus] = useState(true);
  const [nurseryMenuError, setNurseryMenuError] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) {
      setNurseryMenus({});
      setLoadingNurseryMenus(false);
      setNurseryMenuError(null);
      return;
    }
    setLoadingNurseryMenus(true);
    setNurseryMenus({});
    setNurseryMenuError(null);

    const unsub = onSnapshot(
      collection(db, `households/${householdId}/nurseryMenus`),
      (snap) => {
        const data: NurseryMenus = {};
        snap.docs.forEach((d) => {
          if (!isValidDateKey(d.id)) return;
          const docData = d.data();
          data[d.id] = {
            menu: toStringArray(docData.menu),
            snack: toStringArray(docData.snack),
          };
        });
        setNurseryMenus(data);
        setNurseryMenuError(null);
        setLoadingNurseryMenus(false);
      },
      (err) => {
        console.error("[useNurseryMenus] snapshot error:", err.code);
        setNurseryMenuError("給食データの取得に失敗しました");
        setLoadingNurseryMenus(false);
      }
    );

    return () => unsub();
  }, [householdId]);

  return { nurseryMenus, loadingNurseryMenus, nurseryMenuError };
}

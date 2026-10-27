import { useState, useEffect, useCallback } from "react";
import { collection, doc, FieldPath, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { MealProposal, MealProposalAdoption, MealProposalDish, MealProposalStatus } from "../types";
import { getDateKey } from "../utils/helpers";

// 期間が終わってからも、この日数のあいだは提案を読み込む（あとから採用できるように）
const KEEP_DAYS_AFTER_END = 14;
const STATUSES: MealProposalStatus[] = ["new", "opened", "done", "dismissed"];
const ROLES = ["main", "side", "soup", "other"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const isText = (value: unknown): value is string => typeof value === "string" && value !== "";

// 取り込み時に形式チェック済みだが、壊れた文書でアプリが落ちないよう、読めない部分は捨てる
function toDish(value: unknown): MealProposalDish | null {
  if (!isRecord(value) || !isText(value.id) || !isText(value.name)) return null;
  const role = ROLES.find((r) => r === value.role) ?? "other";
  const dish: MealProposalDish = { id: value.id, name: value.name, role, ingredients: toStringArray(value.ingredients), steps: toStringArray(value.steps) };
  if (Array.isArray(value.coopItems)) dish.coopItems = toStringArray(value.coopItems);
  if (isText(value.note)) dish.note = value.note;
  return dish;
}

function toProposal(id: string, data: Record<string, unknown>): MealProposal | null {
  if (!isText(data.periodStart) || !isText(data.periodEnd) || !Array.isArray(data.days)) return null;
  const days = data.days.flatMap((day) => {
    if (!isRecord(day) || !isText(day.date) || !Array.isArray(day.dishes)) return [];
    const dishes = day.dishes.map(toDish).filter((dish): dish is MealProposalDish => dish !== null);
    return dishes.length > 0 ? [{ date: day.date, dishes }] : [];
  }).sort((a, b) => a.date.localeCompare(b.date));
  const adoptions: Record<string, MealProposalAdoption> = {};
  if (isRecord(data.adoptions)) {
    Object.entries(data.adoptions).forEach(([dishId, adoption]) => {
      if (isRecord(adoption) && isText(adoption.dateKey) && isText(adoption.recipeId)) {
        adoptions[dishId] = { dateKey: adoption.dateKey, recipeId: adoption.recipeId, adoptedAt: isText(adoption.adoptedAt) ? adoption.adoptedAt : "" };
      }
    });
  }
  const proposal: MealProposal = {
    proposalId: id,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    createdAt: isText(data.createdAt) ? data.createdAt : "",
    days,
    status: STATUSES.find((s) => s === data.status) ?? "new",
    adoptions,
  };
  if (isText(data.comment)) proposal.comment = data.comment;
  return proposal;
}

export const countUnadoptedDishes = (proposal: MealProposal): number =>
  proposal.days.reduce((sum, day) => sum + day.dishes.filter((dish) => !proposal.adoptions[dish.id]).length, 0);

/**
 * AI献立提案(households/{householdId}/mealProposals)をFirestoreとリアルタイム同期するHook
 *
 * 提案の作成はscripts/importMealProposal.mjsのみが行う。アプリは status と adoptions だけを更新する。
 */
export function useMealProposals(householdId: string | null) {
  const [proposals, setProposals] = useState<MealProposal[]>([]);
  const [proposalError, setProposalError] = useState<string | null>(null);

  useEffect(() => {
    setProposals([]);
    setProposalError(null);
    if (!householdId) return;
    const since = new Date();
    since.setDate(since.getDate() - KEEP_DAYS_AFTER_END);
    const proposalsQuery = query(
      collection(db, `households/${householdId}/mealProposals`),
      where("periodEnd", ">=", getDateKey(since))
    );
    return onSnapshot(
      proposalsQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => toProposal(d.id, d.data()))
          .filter((p): p is MealProposal => p !== null)
          .sort((a, b) => b.periodStart.localeCompare(a.periodStart));
        setProposals(list);
        setProposalError(null);
      },
      (err) => {
        console.error("[useMealProposals] snapshot error:", err.code);
        setProposalError("AIの献立提案を読み込めませんでした");
      }
    );
  }, [householdId]);

  const update = useCallback((proposalId: string, ...fieldsAndValues: [FieldPath | string, unknown, ...unknown[]]): void => {
    if (!householdId) return;
    const ref = doc(db, `households/${householdId}/mealProposals`, proposalId);
    updateDoc(ref, ...fieldsAndValues).catch((err) => {
      console.error("[useMealProposals] update failed:", err?.code);
      setProposalError("AIの献立提案の状態を保存できませんでした");
    });
  }, [householdId]);

  const markOpened = useCallback((proposal: MealProposal): void => {
    if (proposal.status === "new") update(proposal.proposalId, "status", "opened");
  }, [update]);

  const dismissProposal = useCallback((proposalId: string): void => {
    update(proposalId, "status", "dismissed");
  }, [update]);

  // 料理IDに「.」などが含まれてもよいよう、FieldPathで1品ずつ書く
  const recordAdoptions = useCallback((proposal: MealProposal, adoptions: Record<string, MealProposalAdoption>): void => {
    const entries = Object.entries(adoptions);
    if (entries.length === 0) return;
    const merged = { ...proposal.adoptions, ...adoptions };
    const allAdopted = proposal.days.every((day) => day.dishes.every((dish) => merged[dish.id]));
    const [[firstId, firstValue], ...rest] = entries;
    const more = rest.flatMap(([dishId, value]) => [new FieldPath("adoptions", dishId), value]);
    update(proposal.proposalId, new FieldPath("adoptions", firstId), firstValue, ...more, "status", allAdopted ? "done" : "opened");
  }, [update]);

  return { proposals, proposalError, markOpened, dismissProposal, recordAdoptions };
}

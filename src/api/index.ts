/**
 * ═══════════════════════════════════════════
 * API関数集
 * ═══════════════════════════════════════════
 *
 * レシピWEB検索: Claude API (web_search) を使用
 * COOP連携: VPS上のCOOP連携APIサーバー (ポート8003)
 */

import { getCoopConfig, getWebApiUrl } from '../config/coopConfig';
import { WebSearchApiResult, CoopData, SuggestResult, PlanResult, SuggestOptions, MealPlanOptions, RecipeExtractResponse } from '../types';

// ═══════════════════════════════════════════
// 共通: タイムアウト付きfetch
// ═══════════════════════════════════════════
// 用途別の目安。AI生成系は応答が遅いため長め、単純な取得は短めに設定する。
const TIMEOUT_FAST = 15000;    // DB読み取り等（COOP食材取得）
const TIMEOUT_NORMAL = 30000;  // スクレイピング / メール取得
const TIMEOUT_SEARCH = 60000;  // WEB検索
const TIMEOUT_AI = 90000;      // AI生成（レシピ提案・献立作成）

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = TIMEOUT_NORMAL): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("通信がタイムアウトしました。時間をおいて再試行してください。");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ═══════════════════════════════════════════
// レシピWEB検索
// ═══════════════════════════════════════════
// POST /api/recipes/search (port 8002, 認証不要)
//
// @param query  - 検索キーワード
// @param offset - ページングオフセット
// @returns { recipes[], total }
export async function searchRecipeFromWeb(query: string, offset: number = 0): Promise<WebSearchApiResult> {
  const baseUrl = await getWebApiUrl();
  const res = await fetchWithTimeout(`${baseUrl}/api/recipes/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      freeText: query,
      season: "",
      category: "",
      limit: 10,
      offset,
      simple_mode: false,
    }),
  }, TIMEOUT_SEARCH);
  if (!res.ok) throw new Error(`Web検索APIエラー (${res.status})`);
  const data = await res.json();
  if (!data.recipes || !Array.isArray(data.recipes)) throw new Error("レシピが見つかりませんでした");
  return {
    recipes: data.recipes.map((r: { name: string; url?: string | null; source?: string }) => ({
      name: r.name,
      url: r.url ?? null,
      source: r.source ?? "",
    })),
    total: data.total ?? data.recipes.length,
  };
}

// ═══════════════════════════════════════════
// レシピタイトル取得
// ═══════════════════════════════════════════
// GET /api/recipe/extract?url=... (port 8004, 認証不要)
// YouTube URLも同じエンドポイントで自動切り替え対応
//
// @param url - レシピ情報を取得するURL
// @returns RecipeExtractResponse（取得失敗時はnull）
export async function extractRecipe(url: string): Promise<RecipeExtractResponse | null> {
  const baseUrl = process.env.EXPO_PUBLIC_SCRAPER_API_URL;
  if (!baseUrl) return null;
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/recipe/extract?url=${encodeURIComponent(url)}`, {}, TIMEOUT_NORMAL);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// タイトルのみ取得（URL入力時の自動補完用）
export async function fetchRecipeTitle(url: string): Promise<string | null> {
  const result = await extractRecipe(url);
  return result?.title ?? null;
}

// ═══════════════════════════════════════════
// COOP API
// ═══════════════════════════════════════════

/**
 * COOP注文食材の取得
 * GET /api/coop/ingredients
 *
 * @returns カテゴリ分類済みの食材リスト
 */
/**
 * GmailからCOOP注文メールを取得してVPSに保存
 * POST /api/coop/fetch
 *
 * @param daysBack - 遡る日数（デフォルト14）
 * @returns { status: "success" | "no_data", message: string, orders?: number }
 */
export async function triggerCoopFetch(daysBack: number = 14): Promise<{ status: "success" | "no_data"; message: string; orders?: number }> {
  const { url, token } = await getCoopConfig();
  const res = await fetchWithTimeout(`${url}/api/coop/fetch?days_back=${daysBack}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }, TIMEOUT_NORMAL);
  if (res.status === 401) throw new Error("認証に失敗しました。トークンを確認してください。");
  if (!res.ok) throw new Error(`サーバーエラー (${res.status})`);
  return res.json();
}

export async function fetchCoopIngredients(): Promise<CoopData> {
  const { url, token } = await getCoopConfig();
  const res = await fetchWithTimeout(`${url}/api/coop/ingredients`, {
    headers: { Authorization: `Bearer ${token}` },
  }, TIMEOUT_FAST);
  if (res.status === 401) throw new Error("認証に失敗しました。トークンを確認してください。");
  if (res.status === 404) throw new Error("注文データが見つかりません。");
  if (!res.ok) throw new Error(`サーバーエラー (${res.status})`);
  return res.json();
}

/**
 * 食材からレシピを提案
 * POST /api/coop/suggest-recipes
 *
 * @param ingredients - 食材名の配列
 * @param options - { season?, genre?, servings?, mode? }
 * @returns { ingredients_used, season, recipes[], total_recipes }
 */
export async function suggestCoopRecipes(
  ingredients: string[],
  options: SuggestOptions = {}
): Promise<SuggestResult> {
  const { url, token } = await getCoopConfig();
  const res = await fetchWithTimeout(`${url}/api/coop/suggest-recipes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ingredients, ...options }),
  }, TIMEOUT_AI);
  if (res.status === 401) throw new Error("認証に失敗しました。トークンを確認してください。");
  if (res.status === 400) throw new Error("リクエストが不正です。食材を選択し直してください。");
  if (!res.ok) throw new Error(`サーバーエラー (${res.status})`);
  return res.json();
}

/**
 * 食材から献立プランを自動作成
 * POST /api/coop/meal-plan
 *
 * @param ingredients - 食材名の配列
 * @param options - { season?, servings?, simple_mode? }
 * @returns { plan[], unused_ingredients[] }
 */
export async function createCoopMealPlan(
  ingredients: string[],
  options: MealPlanOptions = {}
): Promise<PlanResult> {
  const { url, token } = await getCoopConfig();
  const res = await fetchWithTimeout(`${url}/api/coop/meal-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ingredients, ...options }),
  }, TIMEOUT_AI);
  if (res.status === 401) throw new Error("認証に失敗しました。トークンを確認してください。");
  if (res.status === 400) throw new Error("リクエストが不正です。食材を選択し直してください。");
  if (!res.ok) throw new Error(`サーバーエラー (${res.status})`);
  return res.json();
}

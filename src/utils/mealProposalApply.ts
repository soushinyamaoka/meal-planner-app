import { MealProposalAdoption, MealProposalDish, MenuItem, Menus, Recipe } from "../types";

// 採用する料理と、その料理を入れる日付
export type ProposalPick = { dish: MealProposalDish; dateKey: string };

/**
 * AI献立提案から選んだ料理を、献立に追加する内容に変換する。
 * - レシピ一覧に同じ名前のレシピがあれば、それを使う（AI相談の追加と同じ）。
 * - 無ければ、材料と作り方を献立専用レシピ（showInList: false）として作る。同じ名前を何品選んでも1つだけ作る。
 * - 既存の献立は残し、後ろに追加する。dateKey は読み込み済みの範囲（今日〜DAYS_AFTER日後）であること（呼び出し側で保証する）。
 */
export function buildProposalAppend(options: {
  picks: ProposalPick[];
  menus: Menus;
  recipes: Recipe[];
  genId: () => string;
  now: string;
}): { recipesToSave: Recipe[]; menuUpdates: Record<string, MenuItem[]>; adoptions: Record<string, MealProposalAdoption> } {
  const created = new Map<string, Recipe>();
  const additions: Record<string, MenuItem[]> = {};
  const adoptions: Record<string, MealProposalAdoption> = {};

  options.picks.forEach(({ dish, dateKey }) => {
    const registered = options.recipes.find(recipe => recipe.showInList !== false && recipe.name === dish.name);
    let recipe = registered ?? created.get(dish.name);
    if (!recipe) {
      recipe = { id: options.genId(), name: dish.name, ingredients: dish.ingredients, steps: dish.steps, showInList: false };
      created.set(dish.name, recipe);
    }
    (additions[dateKey] ??= []).push({ id: options.genId(), name: dish.name, recipeId: recipe.id });
    adoptions[dish.id] = { dateKey, recipeId: recipe.id, adoptedAt: options.now };
  });

  const menuUpdates: Record<string, MenuItem[]> = {};
  Object.entries(additions).forEach(([dateKey, items]) => {
    menuUpdates[dateKey] = [...(options.menus[dateKey] ?? []), ...items];
  });
  return { recipesToSave: [...created.values()], menuUpdates, adoptions };
}

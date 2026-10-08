import { MenuItem, Menus, Recipe } from "../types";
import { ParsedMeal } from "./aiMealPlan";

export const getAiDishKey = (dateKey: string, index: number): string => `${dateKey}#${index + 1}`;

// 材料も作り方も無い料理（「味噌汁」「牛丼」のように、レシピにするほどではない料理を名前だけ書いたもの）。
// 片方だけ欠けている料理は、AIの回答が途中で切れた可能性があるため含めない。
export const isNameOnlyDish = (dish: ParsedMeal["dishes"][number]): boolean =>
  dish.ingredients.length === 0 && dish.steps.length === 0;

// 読み取った直後に選択済みにする料理。料理名だけの料理は、貼り付けてそのまま追加できるよう最初から選ぶ。
// AIのレシピ候補（材料・作り方つき）は、気に入ったものだけを選ぶ使い方のため、選ばない。
export const getDefaultSelectedDishKeys = (meals: ParsedMeal[]): string[] =>
  meals.flatMap(meal => meal.dishes.flatMap((dish, index) => (isNameOnlyDish(dish) ? [getAiDishKey(meal.dateKey, index)] : [])));

// 画面全体の「全部選ぶ」で選ぶ料理（追加済みは除く）。
export const getAllSelectableDishKeys = (meals: ParsedMeal[], addedDishKeys: string[]): string[] =>
  meals.flatMap(meal => meal.dishes.map((_, index) => getAiDishKey(meal.dateKey, index))).filter(key => !addedDishKeys.includes(key));

export function buildAiMealAppend(options: {
  meals: ParsedMeal[];
  selectedDishKeys: string[];
  addedDishKeys: string[];
  menus: Menus;
  recipes: Recipe[];
  createdRecipeIds: Record<string, string>;
  genId: () => string;
}): { recipesToSave: Recipe[]; menuUpdates: Record<string, MenuItem[]>; createdRecipeIds: Record<string, string>; addedDishKeys: string[] } {
  const selected = new Set(options.selectedDishKeys);
  const alreadyAdded = new Set(options.addedDishKeys);
  const recipeIds = { ...options.createdRecipeIds };
  const created = new Map<string, Recipe>();
  const additions: Record<string, MenuItem[]> = {};
  const addedKeys: string[] = [];

  options.meals.forEach(meal => meal.dishes.forEach((dish, index) => {
    const key = getAiDishKey(meal.dateKey, index);
    if (!selected.has(key) || alreadyAdded.has(key)) return;
    const registered = options.recipes.find(recipe => recipe.showInList !== false && recipe.name === dish.name);
    let recipeId = registered?.id;
    if (!recipeId && dish.ingredients.length > 0 && dish.steps.length > 0) {
      recipeId = recipeIds[dish.name];
      // 記録したレシピが、すでに削除されている場合は使わない（参照されない献立専用レシピは自動で削除されるため）。
      // この呼び出しで作ったレシピ（created）は、まだ保存前なのでrecipesには無いが、有効とみなす。
      if (recipeId && !created.has(dish.name) && !options.recipes.some(recipe => recipe.id === recipeId)) recipeId = undefined;
      if (!recipeId) {
        const recipe = { id: options.genId(), name: dish.name, ingredients: dish.ingredients, steps: dish.steps, showInList: false };
        recipeId = recipe.id;
        recipeIds[dish.name] = recipeId;
        created.set(dish.name, recipe);
      }
    }
    const item: MenuItem = recipeId
      ? { id: options.genId(), name: dish.name, recipeId }
      : { id: options.genId(), name: dish.name };
    (additions[meal.dateKey] ??= []).push(item);
    addedKeys.push(key);
  }));

  const menuUpdates: Record<string, MenuItem[]> = {};
  Object.entries(additions).forEach(([dateKey, items]) => {
    menuUpdates[dateKey] = [...(options.menus[dateKey] ?? []), ...items];
  });
  return { recipesToSave: [...created.values()], menuUpdates, createdRecipeIds: recipeIds, addedDishKeys: addedKeys };
}

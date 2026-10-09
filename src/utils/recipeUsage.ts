import { Menus, Recipe } from "../types";

// レシピが献立で使われたことがあるか。
// recipeIdが一致する料理に加え、recipeIdを持たず料理名が一致する料理も「使った」とみなす
// （recipeIdの無い献立は、開いたときに同じ名前のレシピへ名前でつながるため）。
export const isRecipeUsedInMenus = (recipe: Pick<Recipe, "id" | "name">, menus: Menus): boolean =>
  Object.values(menus).some(items =>
    items.some(item => item.recipeId === recipe.id || (!item.recipeId && item.name === recipe.name)));

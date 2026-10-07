import { ParsedMeal } from "./aiMealPlan";

export type AiMealDraft = {
  ingredients: string[];
  removedIngredients: string[];
  otherIngredients: string;
  startOffset: number;
  days: number;
  people: number;
  notes: string;
  prompt: string;
  answer: string;
  preview: ParsedMeal[] | null;
  unreadable: string[];
  notice: string;
  expanded: Set<string>;
  selectedDishKeys: string[];
  addedDishKeys: string[];
  createdRecipeIds: Record<string, string>;
};

export const createAiMealDraft = (selectedNames: string[] = []): AiMealDraft => ({
  ingredients: [...new Set(selectedNames)],
  removedIngredients: [],
  otherIngredients: "",
  startOffset: 0,
  days: 3,
  people: 2,
  notes: "",
  prompt: "",
  answer: "",
  preview: null,
  unreadable: [],
  notice: "",
  expanded: new Set(),
  selectedDishKeys: [],
  addedDishKeys: [],
  createdRecipeIds: {},
});

export const mergeSelectedIntoChips = (chips: string[], removed: string[], selected: string[]): string[] => {
  const result = [...chips];
  const seen = new Set(chips);
  const removedSet = new Set(removed);
  for (const name of selected) {
    if (!seen.has(name) && !removedSet.has(name)) {
      result.push(name);
      seen.add(name);
    }
  }
  return result;
};

export const resetAiMealDraft = (selectedNames: string[]): AiMealDraft => createAiMealDraft(selectedNames);

export type RecipeCategory = {
  id: string;
  name: string;
};

export type RecipeExtractResponse = {
  url: string;
  title: string | null;
  source: string;
  ingredients: string[] | null;
  instructions: string[] | null;
  error?: string;
};

export type Recipe = {
  id: string;
  name: string;
  ingredients: string[];
  steps: string[];
  url?: string;
  categoryIds?: string[];
  showInList?: boolean; // false = 献立専用（レシピ一覧に表示しない）
};

export type RecipeFormData = {
  id?: string;
  name: string;
  ingredients: string[];
  steps: string[];
  url?: string;
  categoryIds?: string[];
};

export type MenuItem = {
  id?: string; // React keyの安定化用。古いデータでは存在しない可能性あり
  name: string;
  recipeId?: string;
};

export type Menus = Record<string, MenuItem[]>;

export type CoopItem = {
  order_no: string;
  name: string;
  original_name: string;
  quantity: number;
  category: string;
  category_source: "auto" | "user_override";
};

export type CoopCategoryKey = "ingredients" | "kits" | "ready_to_eat" | "baby_food" | "seasonings";

export type CoopCategory = {
  key: CoopCategoryKey;
  label: string;
  emoji: string;
  color: string;
};

export type CoopData = {
  order_date: string;
  parsed_at: string;
  ingredients: CoopItem[];
  kits: CoopItem[];
  ready_to_eat: CoopItem[];
  baby_food: CoopItem[];
  seasonings: CoopItem[];
  excluded: { name: string; reason: string }[];
};

export type SuggestRecipe = {
  name: string;
  source: "ai_generate" | "web_search";
  time?: string;
  difficulty?: string;
  calories?: string;
  ingredients?: string[];
  steps?: string[];
  url?: string;
};

export type SuggestResult = {
  ingredients_used: string[];
  season: string;
  recipes: SuggestRecipe[];
  total_recipes: number;
};

export type PlanRecipe = {
  name: string;
  time?: string;
  difficulty?: string;
  calories?: string;
  ingredients?: string[];
  steps?: string[];
  tips?: string[];
};

export type WebRecipe = {
  name: string;
  url?: string;
  source?: string;
  description?: string;
} | null;

export type PlanDayItem = {
  day: number;
  label: string;
  recipe: PlanRecipe;
  web_recipe: WebRecipe;
  used_ingredients: string[];
  remaining_ingredients: string[];
};

export type PlanResult = {
  plan: PlanDayItem[];
  unused_ingredients: string[];
};

export type MenuRef = { dateKey: string; index: number };

export type WebSearchItem = {
  name: string;
  url: string | null;
  source: string;
};

export type WebSearchApiResult = {
  recipes: WebSearchItem[];
  total: number;
};

export type SuggestOptions = {
  season?: string;
  genre?: string;
  servings?: number;
  mode?: "generate" | "search" | "both";
};

export type MealPlanOptions = {
  season?: string;
  servings?: number;
  simple_mode?: boolean;
};

export type ModalState = {
  mode: "view" | "edit" | "create" | "create-for-meal" | "unlinked" | "search";
  recipe?: Recipe;
  prefillName?: string;
  dateKey?: string;
  menuRef?: MenuRef;
};

// ─── Firebase / Auth ───────────────────────────────────────────────────────────
export type AppUser = {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
};

export type HouseholdInvite = {
  email: string;
  invitedBy: string; // uid
  invitedAt: string; // ISO date string
};

export type Household = {
  id: string;
  name: string;
  members: string[]; // uid[]
  invites: HouseholdInvite[];
};

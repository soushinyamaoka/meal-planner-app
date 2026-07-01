import { Recipe, MenuItem, Menus, CoopItem, CoopData, CoopCategory, RecipeCategory } from "../types";
import { getDateKey } from "../utils/helpers";

// ─── Helper ───
const dk = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return getDateKey(d);
};

// ─── Sample Recipes ───
export const sampleRecipes: Recipe[] = [
  {
    id: "1", name: "カレーライス",
    ingredients: ["豚肉 200g", "玉ねぎ 2個", "じゃがいも 2個", "にんじん 1本", "カレールー 1箱", "ごはん 適量"],
    steps: ["野菜と肉を一口大に切る", "鍋で肉を炒め、野菜を加える", "水を加えて20分煮込む", "ルーを入れてとろみがつくまで煮る"],
    url: "https://cookpad.com/recipe/example"
  },
  {
    id: "2", name: "鮭の塩焼き",
    ingredients: ["鮭切り身 2切れ", "塩 少々", "レモン 1/4個"],
    steps: ["鮭に塩をふり10分おく", "グリルで中火で7分焼く", "レモンを添えて盛り付ける"],
  },
  {
    id: "3", name: "豚の生姜焼き",
    ingredients: ["豚ロース薄切り 300g", "玉ねぎ 1個", "生姜 1かけ", "醤油 大さじ2", "みりん 大さじ2", "酒 大さじ1"],
    steps: ["生姜をすりおろし、調味料と合わせる", "豚肉をタレに10分漬ける", "フライパンで玉ねぎを炒める", "豚肉を加えて焼き色がつくまで焼く"],
  },
  {
    id: "4", name: "肉じゃが",
    ingredients: ["牛肉 200g", "じゃがいも 3個", "にんじん 1本", "玉ねぎ 1個", "しらたき 1袋", "醤油 大さじ3", "砂糖 大さじ2", "みりん 大さじ2"],
    steps: ["材料を食べやすい大きさに切る", "鍋で牛肉を炒める", "野菜としらたきを加える", "調味料とだし汁を加えて落し蓋で20分煮る"],
  },
];

// ─── Sample Menus ───
export const sampleMenus: Menus = {
  [dk(-3)]: [{ name: "おでん" }, { name: "ほうれん草のおひたし" }],
  [dk(-2)]: [{ name: "肉じゃが", recipeId: "4" }, { name: "わかめの味噌汁" }],
  [dk(-1)]: [{ name: "鮭の塩焼き", recipeId: "2" }, { name: "きんぴらごぼう" }],
  [dk(0)]: [{ name: "カレーライス", recipeId: "1" }, { name: "コールスローサラダ" }],
  [dk(1)]: [{ name: "豚の生姜焼き", recipeId: "3" }, { name: "ポテトサラダ" }],
  [dk(3)]: [{ name: "パスタ ボロネーゼ" }],
};

// ─── COOP Dummy Data ───
// 実APIでは GET /api/coop/ingredients のレスポンスに相当
export const COOP_DUMMY_DATA: CoopData = {
  order_date: "2026-03-28",
  parsed_at: "2026-03-28T20:00:00",
  ingredients: [
    { order_no: "000071", name: "鶏もも肉", original_name: "若鶏もも肉 300g", quantity: 1, category: "食材", category_source: "auto" },
    { order_no: "000072", name: "豚バラ肉", original_name: "国産豚バラ薄切り 250g", quantity: 1, category: "食材", category_source: "auto" },
    { order_no: "000073", name: "キャベツ", original_name: "キャベツ 1玉", quantity: 1, category: "食材", category_source: "auto" },
    { order_no: "000074", name: "にんじん", original_name: "にんじん 3本", quantity: 1, category: "食材", category_source: "auto" },
    { order_no: "000075", name: "じゃがいも", original_name: "じゃがいも 5個", quantity: 1, category: "食材", category_source: "auto" },
    { order_no: "000076", name: "玉ねぎ", original_name: "玉ねぎ 3個", quantity: 1, category: "食材", category_source: "auto" },
    { order_no: "000077", name: "ほうれん草", original_name: "ほうれん草 1束", quantity: 1, category: "食材", category_source: "auto" },
    { order_no: "000078", name: "塩鮭", original_name: "塩鮭切身 3切", quantity: 1, category: "食材", category_source: "auto" },
    { order_no: "000079", name: "卵", original_name: "産直たまご 10個", quantity: 1, category: "食材", category_source: "auto" },
  ],
  kits: [
    { order_no: "000080", name: "ビビンバセット", original_name: "簡単ビビンバセット 2人前", quantity: 1, category: "調理キット", category_source: "auto" },
    { order_no: "000081", name: "餃子", original_name: "冷凍餃子 12個入", quantity: 1, category: "調理キット", category_source: "auto" },
  ],
  ready_to_eat: [
    { order_no: "000082", name: "バナナ", original_name: "有機バナナ 1房", quantity: 1, category: "そのまま", category_source: "auto" },
    { order_no: "000083", name: "ヨーグルト", original_name: "プレーンヨーグルト 400g", quantity: 1, category: "そのまま", category_source: "auto" },
  ],
  baby_food: [],
  seasonings: [
    { order_no: "000084", name: "醤油", original_name: "丸大豆しょうゆ 500ml", quantity: 1, category: "調味料・日用品", category_source: "auto" },
  ],
  excluded: [
    { name: "キッチンペーパー 4ロール", reason: "数量0点（未注文）" },
  ],
};

// ─── Default Recipe Categories ───
export const defaultRecipeCategories: RecipeCategory[] = [
  { id: "cat-favorite", name: "お気に入り" },
  { id: "cat-japanese", name: "和食" },
  { id: "cat-western", name: "洋食" },
  { id: "cat-chinese", name: "中華" },
];

// ─── COOP Categories ───
export const COOP_CATEGORIES: CoopCategory[] = [
  { key: "ingredients", label: "食材", emoji: "🥬", color: "#5a8a4a" },
  { key: "kits", label: "調理キット", emoji: "🍱", color: "#c47a32" },
  { key: "ready_to_eat", label: "そのまま", emoji: "🍌", color: "#7a6ab5" },
  { key: "baby_food", label: "離乳食", emoji: "👶", color: "#d4725c" },
  { key: "seasonings", label: "調味料・日用品", emoji: "🧂", color: "#8a7e72" },
];

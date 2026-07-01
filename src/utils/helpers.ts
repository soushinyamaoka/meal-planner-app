// ─── Constants ───
export const DAYS_AFTER = 14;
export const ARCHIVE_DAYS = 7;

// ─── Date Utilities ───
export function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDayLabel(date: Date): string | null {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(date); target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "今日";
  if (diff === 1) return "明日";
  if (diff === -1) return "昨日";
  return null;
}

export function formatDate(date: Date): { month: number; day: number; weekday: string } {
  const w = ["日", "月", "火", "水", "木", "金", "土"];
  return { month: date.getMonth() + 1, day: date.getDate(), weekday: w[date.getDay()] };
}

export function genFutureDates(): Date[] {
  const d: Date[] = [], t = new Date(); t.setHours(0, 0, 0, 0);
  for (let i = 0; i <= DAYS_AFTER; i++) {
    const x = new Date(t); x.setDate(x.getDate() + i); d.push(x);
  }
  return d;
}

export function genArchiveDates(): Date[] {
  const d: Date[] = [], t = new Date(); t.setHours(0, 0, 0, 0);
  for (let i = 1; i <= ARCHIVE_DAYS; i++) {
    const x = new Date(t); x.setDate(x.getDate() - i); d.push(x);
  }
  return d;
}

// 時間帯に応じた挨拶（ヘッダー表示用）
export function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return { text: "おはよう", emoji: "☀️" };
  if (h >= 11 && h < 18) return { text: "こんにちは", emoji: "👋" };
  return { text: "こんばんは", emoji: "🌙" };
}

// ─── Food Emoji ───
// 料理名・食材名のキーワードから内容を推測して絵文字を割り当てる。
// 配列の上から順にマッチ判定するため、より具体的・優先したいものを先に置く。
const emojiKeywords: [readonly string[], string][] = [
  [["カレー"], "🍛"],
  [["寿司", "すし", "鮨", "刺身", "さしみ", "海鮮", "ちらし"], "🍣"],
  [["ピザ"], "🍕"],
  [["ハンバーガー", "バーガー"], "🍔"],
  [["ハンバーグ", "ミートボール"], "🍖"],
  [["ラーメン", "らーめん", "中華そば", "つけ麺"], "🍜"],
  [["うどん", "そば", "蕎麦", "にゅうめん", "そうめん"], "🍜"],
  [["パスタ", "スパゲ", "ペペロンチーノ", "ナポリタン", "ボロネーゼ", "カルボナーラ"], "🍝"],
  [["唐揚げ", "から揚げ", "からあげ", "竜田", "手羽", "チキン", "焼き鳥", "焼鳥", "鶏", "とり"], "🍗"],
  [["ステーキ", "牛", "ビーフ", "焼肉", "ローストビーフ", "プルコギ"], "🥩"],
  [["豚", "ポーク", "生姜焼き", "しょうが焼き", "とんかつ", "トンカツ", "豚カツ", "角煮", "肉じゃが", "そぼろ", "肉"], "🍖"],
  [["鮭", "さけ", "サーモン", "さば", "鯖", "さんま", "秋刀魚", "あじ", "鯵", "ぶり", "鰤", "まぐろ", "鮪", "たら", "鱈", "ほっけ", "ししゃも", "焼き魚", "煮魚", "魚", "さかな"], "🐟"],
  [["えび", "海老", "エビ", "天ぷら", "天プラ", "てんぷら", "フライ", "コロッケ", "から揚", "揚げ"], "🍤"],
  [["餃子", "ぎょうざ", "ギョーザ", "焼売", "シュウマイ", "しゅうまい", "春巻"], "🥟"],
  [["グラタン", "ドリア", "チーズ", "ピラフ"], "🧀"],
  [["サラダ", "マリネ", "コールスロー"], "🥗"],
  [["鍋", "なべ", "しゃぶ", "すき焼き", "すきやき", "おでん", "もつ煮", "ポトフ"], "🍲"],
  [["スープ", "汁", "味噌汁", "みそ汁", "豚汁", "シチュー", "ポタージュ", "ミネストローネ"], "🥣"],
  [["オムライス", "オムレツ", "卵", "玉子", "たまご", "目玉焼き", "スクランブル", "茶碗蒸し", "だし巻き"], "🍳"],
  [["丼", "どんぶり", "親子丼", "牛丼", "カツ丼", "天丼", "海鮮丼"], "🍚"],
  [["おにぎり", "おむすび", "ごはん", "ご飯", "白米", "炊き込み", "チャーハン", "焼き飯", "リゾット"], "🍙"],
  [["麻婆", "マーボー", "豆腐", "厚揚げ", "がんも"], "🫕"],
  [["炒め", "野菜", "ナムル", "おひたし", "和え", "きんぴら", "煮物", "ひじき", "切り干し"], "🥬"],
  [["パン", "サンド", "トースト", "サンドイッチ", "ホットドッグ"], "🥪"],
  [["ケーキ", "デザート", "プリン", "スイーツ", "パンケーキ", "ホットケーキ"], "🍰"],
];
// キーワードに一致しない場合のフォールバック（名前のハッシュで安定した絵文字を割り当てる）
const fallbackEmojis = ["🍛", "🍖", "🥗", "🍲", "🐟", "🥘", "🍳", "🍜", "🥩", "🍙", "🍤", "🥬", "🫕", "🍱", "🍣"];
export function getEmoji(t: string): string {
  for (const [keywords, emoji] of emojiKeywords) {
    if (keywords.some(kw => t.includes(kw))) return emoji;
  }
  let h = 0;
  for (let i = 0; i < t.length; i++) h = t.charCodeAt(i) + ((h << 5) - h);
  return fallbackEmojis[Math.abs(h) % fallbackEmojis.length];
}

// ─── ID Generator ───
export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Data Cleanup ───
export function cleanOldMenus<T>(menus: Record<string, T[]>): Record<string, T[]> {
  const cutoff = new Date(); cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - ARCHIVE_DAYS);
  const r: Record<string, T[]> = {};
  for (const [k, v] of Object.entries(menus)) {
    if (new Date(k + "T00:00:00") >= cutoff) r[k] = v;
  }
  return r;
}

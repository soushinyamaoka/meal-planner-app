export type ParsedDish = { name: string; ingredients: string[]; steps: string[] };
export type ParsedMeal = { date: Date; dateKey: string; dishes: ParsedDish[] };
export type ParseMealPlanResult = { meals: ParsedMeal[]; unreadableLines: string[] };

const normalizeDigits = (s: string): string => s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
const cleanItem = (s: string): string => s.trim().replace(/^(?:(?:[-・*])\s*|(?:\d+[.)．、]|[①-⑳])\s*)/, "").trim();

export function parseAiMealPlan(text: string, startDate: Date): ParseMealPlanResult {
  const anchor = new Date(startDate); anchor.setHours(0, 0, 0, 0);
  const byKey = new Map<string, ParsedMeal>();
  const unreadableLines: string[] = [];
  let activeDish: ParsedDish | null = null;
  let currentKind: "ingredients" | "steps" | null = null;
  // 料理は直前に読んだ日付へ付ける（日付が降順・順不同でもずれないようにする）
  let currentMeal: ParsedMeal | null = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const normalized = normalizeDigits(raw).replace(/\*\*/g, "").trim();
    let line = normalized.replace(/^#{1,3}\s*/, "").trim();
    const inDetails = Boolean(activeDish && currentKind);
    // Bullets/numbering may be stripped from date candidates only outside recipe detail sections.
    if (!inDetails) line = line.replace(/^(?:[-・*]\s*|\d+[.)．、]\s*)/, "").trim();

    const dateMatch = line.match(/^(\d{1,2})(?:[\/／](\d{1,2})|(月)(\d{1,2})日)(?:\s*[（(][日月火水木金土](?:曜日?)?[）)])?\s*(?:(?:[:：])\s*(.*))?$/);
    if (dateMatch) {
      // 読めない日付の後ろの料理を、前の日付へ付けないようにする
      activeDish = null; currentKind = null; currentMeal = null;
      const month = Number(dateMatch[1]);
      const day = Number(dateMatch[2] ?? dateMatch[4]);
      if (month < 1 || month > 12 || day < 1 || day > 31) { unreadableLines.push(raw); continue; }
      let year = anchor.getFullYear();
      let date = new Date(year, month - 1, day);
      if (date.getMonth() !== month - 1 || date.getDate() !== day) { unreadableLines.push(raw); continue; }
      if (date < anchor) {
        if (anchor.getMonth() >= 9 && month <= 3) { year++; date = new Date(year, month - 1, day); }
        else { unreadableLines.push(raw); continue; }
      }
      if (date < anchor || date.getMonth() !== month - 1 || date.getDate() !== day) { unreadableLines.push(raw); continue; }
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dishes: ParsedDish[] = [];
      const legacy = dateMatch[5]?.trim();
      if (legacy) legacy.split(/[\/／、,，]/).map(x => x.trim()).filter(Boolean).forEach(name => dishes.push({ name, ingredients: [], steps: [] }));
      currentMeal = { date, dateKey, dishes };
      byKey.set(dateKey, currentMeal);
      continue;
    }

    const meal = currentMeal;
    const dishMatch = line.match(/^[■□●◆]\s*(.+)$/);
    if (dishMatch) {
      if (!meal) { unreadableLines.push(raw); continue; }
      const name = dishMatch[1].trim().replace(/\s*[（(](?:\d+\s*人(?:分|前)?)[）)]\s*$/, "").trim();
      if (!name) { unreadableLines.push(raw); continue; }
      meal.dishes.push({ name, ingredients: [], steps: [] });
      activeDish = null; currentKind = null;
      continue;
    }
    const sectionMatch = line.match(/^[【\[]?\s*(材料|作り方|手順)\s*[】\]]?\s*(?:[（(][^）)]*[）)])?\s*[:：]?\s*(.*)$/);
    if (sectionMatch) {
      const dish = meal?.dishes.at(-1);
      if (!dish) { unreadableLines.push(raw); continue; }
      const kind = sectionMatch[1] === "材料" ? "ingredients" : "steps";
      const trailing = cleanItem(sectionMatch[2]);
      if (trailing) dish[kind].push(trailing);
      activeDish = dish;
      currentKind = kind;
      continue;
    }
    if (activeDish && currentKind) {
      const item = cleanItem(line);
      // 箇条書き記号や番号の付いた行は、常に材料・作り方の項目とする（「。」で終わる手順も含む）。
      // 記号のない行だけ、締めくくりの文章らしい言葉で説明文と判定し、項目に入れない。
      const hasMarker = item !== line.trim();
      const looksNarrative = !hasMarker && /^(?:以上|まとめ)|召し上がれ|お楽しみ|いかがでしょう|参考にして/.test(item);
      if (item && !looksNarrative) {
        activeDish[currentKind].push(item);
        continue;
      }
      activeDish = null; currentKind = null;
    }
    unreadableLines.push(raw);
  }
  return { meals: [...byKey.values()].sort((a, b) => a.date.getTime() - b.date.getTime()), unreadableLines };
}

export function buildAiMealPrompt(options: { startDate: Date; days: number; people: number; ingredients: string[]; notes: string }): string {
  const dates = Array.from({ length: options.days }, (_, i) => {
    const date = new Date(options.startDate); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + i);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });
  const example = `${dates[0]}\n■ 料理1\n材料:\n- 食材 分量\n作り方:\n1. 手順\n■ 料理2\n材料:\n- 食材 分量\n作り方:\n1. 手順`;
  return `家庭で作りやすい夕食の献立を考えてください。指定食材をなるべく使い切ってください。\n\n期間（1日1食・夕食）: ${dates.join("、")}\n人数: ${options.people}人\n使う食材: ${options.ingredients.length ? options.ingredients.join("、") : "指定なし"}\n補足: ${options.notes.trim() || "なし"}\n材料は${options.people}人分の分量で書いてください。\n\n回答は次の形式だけにしてください。この形式以外の前置き・説明・まとめは書かないでください。各日付について必ず書いてください。日付の行には日付だけを書いてください。料理名の行は ■ で始め、料理名だけを書いてください。材料は1行に1つ、作り方は番号付きで1行に1手順を書いてください。\n${example}`;
}

export type ParsedMeal = { date: Date; dateKey: string; dishes: string[] };
export type ParseMealPlanResult = { meals: ParsedMeal[]; unreadableLines: string[] };

const normalizeDigits = (s: string): string => s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));

export function parseAiMealPlan(text: string, startDate: Date): ParseMealPlanResult {
  const anchor = new Date(startDate); anchor.setHours(0, 0, 0, 0);
  const byKey = new Map<string, ParsedMeal>();
  const unreadableLines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) { unreadableLines.push(raw); continue; }
    // 太字(**)を先に外す。先に箇条書き記号を外すと、行頭の「**」の片方が記号として消えてしまう。
    const line = normalizeDigits(raw).replace(/\*\*/g, "").trim().replace(/^(?:[-・*]|\d+\.)\s*/, "").trim();
    // 曜日は日付の直後にあるものだけを無視する（料理名には触れない）。
    const match = line.match(/^(\d{1,2})(?:[\/／](\d{1,2})|(月)(\d{1,2})日)(?:\s*[（(][日月火水木金土](?:曜日?)?[）)])?\s*[:：]?\s*(.*)$/);
    if (!match) { unreadableLines.push(raw); continue; }
    const month = Number(match[1]);
    const day = Number(match[2] ?? match[4]);
    const dishes = (match[5] ?? "").split(/[\/／、]/).map(x => x.trim()).filter(Boolean);
    if (!dishes.length || month < 1 || month > 12 || day < 1 || day > 31) { unreadableLines.push(raw); continue; }
    let year = anchor.getFullYear();
    let date = new Date(year, month - 1, day);
    if (date.getMonth() !== month - 1 || date.getDate() !== day) { unreadableLines.push(raw); continue; }
    if (date < anchor) {
      if (anchor.getMonth() >= 9 && month <= 3) { year++; date = new Date(year, month - 1, day); }
      else { unreadableLines.push(raw); continue; }
    }
    if (date < anchor || date.getMonth() !== month - 1 || date.getDate() !== day) { unreadableLines.push(raw); continue; }
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    byKey.set(dateKey, { date, dateKey, dishes });
  }
  return { meals: [...byKey.values()].sort((a, b) => a.date.getTime() - b.date.getTime()), unreadableLines };
}

export function buildAiMealPrompt(options: { startDate: Date; days: number; people: number; ingredients: string[]; notes: string }): string {
  const dates = Array.from({ length: options.days }, (_, i) => {
    const date = new Date(options.startDate); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + i);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });
  const example = `${dates[0]}: 料理1 / 料理2`;
  return `家庭で作りやすい夕食の献立を考えてください。指定食材をなるべく使い切ってください。\n\n期間（1日1食・夕食）: ${dates.join("、")}\n人数: ${options.people}人\n使う食材: ${options.ingredients.length ? options.ingredients.join("、") : "指定なし"}\n補足: ${options.notes.trim() || "なし"}\n\n次の形式だけで、1日1行で答えてください。前置き・説明・番号・記号は付けないでください。\n各日付について必ず1行ずつ答えてください。料理名は「 / 」で区切ってください。\n${example}`;
}

// AI献立提案ファイル（schemaVersion 1）の形式チェック
//
// 仕様は docs/MEAL_PROPOSAL_FORMAT.md、機械向けの定義は docs/meal-proposal.schema.json。
// ここを変えるときは、その2つも合わせて変える。
// importMealProposal.mjs から使う。エラーの一覧を返し、空なら合格。

export const MAX_PERIOD_DAYS = 14;
const ROLES = ["main", "side", "soup", "other"];
const TOP_KEYS = ["schemaVersion", "proposalId", "periodStart", "periodEnd", "createdAt", "generator", "basedOn", "comment", "days"];
const DAY_KEYS = ["date", "dishes"];
const DISH_KEYS = ["id", "name", "role", "ingredients", "steps", "coopItems", "note"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CREATED_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/;

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value, max) => typeof value === "string" && value.trim() !== "" && value === value.trim() && value.length <= max;

// 実在する日付なら UTC の日数（1970-01-01 からの日数）を、そうでなければ null を返す
function toDayNumber(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.getTime() / 86_400_000;
}

function checkKeys(obj, allowed, where, errors) {
  Object.keys(obj).filter((key) => !allowed.includes(key)).forEach((key) => errors.push(`${where}: 決められていない項目があります: ${key}`));
}

function checkTextList(value, where, maxItems, maxLength, errors, allowEmpty = false) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.length > maxItems) {
    errors.push(`${where}: 文字列の配列（${allowEmpty ? 0 : 1}〜${maxItems}件）にしてください`);
    return;
  }
  value.forEach((item, i) => {
    if (!isText(item, maxLength)) errors.push(`${where}[${i}]: 前後に空白のない、空でない${maxLength}字以内の文字列にしてください`);
  });
}

export function validateMealProposal(data) {
  const errors = [];
  if (!isRecord(data)) return ["ファイル全体が JSON のオブジェクトではありません"];
  checkKeys(data, TOP_KEYS, "トップ", errors);

  if (data.schemaVersion !== 1) errors.push("schemaVersion: 1 にしてください");
  if (data.generator !== "codex") errors.push('generator: "codex" にしてください');
  if (typeof data.createdAt !== "string" || !CREATED_AT_RE.test(data.createdAt) || Number.isNaN(Date.parse(data.createdAt))) {
    errors.push("createdAt: YYYY-MM-DDTHH:mm:ss+09:00 の形にしてください");
  }

  const start = toDayNumber(data.periodStart);
  const end = toDayNumber(data.periodEnd);
  if (start === null) errors.push("periodStart: 実在する日付を YYYY-MM-DD で書いてください");
  if (end === null) errors.push("periodEnd: 実在する日付を YYYY-MM-DD で書いてください");
  if (start !== null && end !== null && (end < start || end - start + 1 > MAX_PERIOD_DAYS)) {
    errors.push(`periodStart〜periodEnd: 1〜${MAX_PERIOD_DAYS}日の期間にしてください`);
  }
  if (data.proposalId !== data.periodStart) errors.push("proposalId: periodStart と同じ日付にしてください");

  if (data.basedOn !== undefined) {
    if (!isRecord(data.basedOn)) {
      errors.push("basedOn: オブジェクトにしてください");
    } else {
      checkKeys(data.basedOn, ["coopOrderDate"], "basedOn", errors);
      if (data.basedOn.coopOrderDate !== undefined && toDayNumber(data.basedOn.coopOrderDate) === null) {
        errors.push("basedOn.coopOrderDate: 実在する日付を YYYY-MM-DD で書いてください");
      }
    }
  }
  if (data.comment !== undefined && !isText(data.comment, 200)) errors.push("comment: 空でない200字以内の文字列にしてください");

  if (!Array.isArray(data.days) || data.days.length === 0) {
    errors.push("days: 1日以上の配列にしてください");
    return errors;
  }
  const seenDates = new Set();
  const seenDishIds = new Set();
  let dishCount = 0;
  data.days.forEach((day, d) => {
    const where = `days[${d}]`;
    if (!isRecord(day)) { errors.push(`${where}: オブジェクトにしてください`); return; }
    checkKeys(day, DAY_KEYS, where, errors);
    const dayNumber = toDayNumber(day.date);
    if (dayNumber === null) {
      errors.push(`${where}.date: 実在する日付を YYYY-MM-DD で書いてください`);
    } else if (start !== null && end !== null && (dayNumber < start || dayNumber > end)) {
      errors.push(`${where}.date: 期間（periodStart〜periodEnd）の外です: ${day.date}`);
    }
    if (seenDates.has(day.date)) errors.push(`${where}.date: 同じ日付が2回あります: ${day.date}`);
    seenDates.add(day.date);

    if (!Array.isArray(day.dishes) || day.dishes.length === 0 || day.dishes.length > 10) {
      errors.push(`${where}.dishes: 1〜10品の配列にしてください`);
      return;
    }
    day.dishes.forEach((dish, i) => {
      const at = `${where}.dishes[${i}]`;
      if (!isRecord(dish)) { errors.push(`${at}: オブジェクトにしてください`); return; }
      dishCount += 1;
      checkKeys(dish, DISH_KEYS, at, errors);
      if (!isText(dish.id, 40)) {
        errors.push(`${at}.id: 空でない40字以内の文字列にしてください`);
      } else if (seenDishIds.has(dish.id)) {
        errors.push(`${at}.id: ファイル内で重複しています: ${dish.id}`);
      }
      seenDishIds.add(dish.id);
      if (!isText(dish.name, 40)) {
        errors.push(`${at}.name: 空でない40字以内の文字列にしてください`);
      } else if (/[｜|]/.test(dish.name)) {
        errors.push(`${at}.name: 料理名だけにしてください（「｜」以降のサイト名などは不要です）`);
      }
      if (!ROLES.includes(dish.role)) errors.push(`${at}.role: ${ROLES.join(" / ")} のどれかにしてください`);
      checkTextList(dish.ingredients, `${at}.ingredients`, 40, 100, errors);
      checkTextList(dish.steps, `${at}.steps`, 30, 300, errors);
      if (dish.coopItems !== undefined) checkTextList(dish.coopItems, `${at}.coopItems`, 20, 60, errors);
      if (dish.note !== undefined && !isText(dish.note, 50)) errors.push(`${at}.note: 空でない50字以内の文字列にしてください`);
    });
  });
  if (dishCount > 100) errors.push("days: 料理は全部で100品以内にしてください");
  return errors;
}

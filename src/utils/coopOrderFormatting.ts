import { formatDate } from "./helpers";

export type CoopOrderDateSource = "delivery_schedule" | "email_date" | "import_time" | null | undefined;

export function getCoopOrderDateLabel(source: CoopOrderDateSource): string {
  switch (source) {
    case "delivery_schedule": return "お届け予定日";
    case "email_date": return "メール受信日";
    case "import_time": return "取り込み日";
    default: return "注文日";
  }
}

export function formatCoopOrderDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date.getFullYear() !== Number(value.slice(0, 4)) || date.getMonth() + 1 !== Number(value.slice(5, 7)) || date.getDate() !== Number(value.slice(8, 10))) return value;
  const formatted = formatDate(date);
  return `${formatted.month}/${formatted.day}(${formatted.weekday})`;
}

// "2026-10-10T07:00:00+09:00" → "10/10 7:00"（サーバーは日本時間で記録する）
function formatCoopFetchTime(value: unknown): string | null {
  const match = typeof value === "string" ? /^\d{4}-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value) : null;
  return match ? `${Number(match[1])}/${Number(match[2])} ${Number(match[3])}:${match[4]}` : null;
}

const FETCH_FAILURE_HINTS: Record<string, string> = {
  auth: "Gmailにログインできていません。アプリパスワードの作り直しが必要な可能性があります。",
  connection: "Gmailに接続できていません。",
};

/**
 * メールの自動取込が失敗しているときに出す文。失敗していない・記録が無い（古いサーバー）ときは null。
 * サーバーの値が想定外の形でも落ちないよう、読めない項目は使わない。
 */
export function describeCoopFetchFailure(status: unknown): string | null {
  if (!status || typeof status !== "object") return null;
  const { last_result, last_error_kind, last_success_at } = status as Record<string, unknown>;
  if (last_result !== "failure") return null;
  const lastSuccess = formatCoopFetchTime(last_success_at);
  const hint = typeof last_error_kind === "string" ? FETCH_FAILURE_HINTS[last_error_kind] : undefined;
  return `COOPメールの自動取り込みに失敗しています（${lastSuccess ? `最後に成功: ${lastSuccess}` : "成功した記録はありません"}）。${hint ?? ""}`;
}

export function formatCoopOrderAmount(amount: number | null | undefined): string | null {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
  const [integer, decimal] = String(amount).split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimal === undefined ? grouped : `${grouped}.${decimal}`;
}

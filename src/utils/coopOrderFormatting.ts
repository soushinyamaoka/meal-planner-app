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

export function formatCoopOrderAmount(amount: number | null | undefined): string | null {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
  const [integer, decimal] = String(amount).split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimal === undefined ? grouped : `${grouped}.${decimal}`;
}

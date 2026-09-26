import AsyncStorage from "@react-native-async-storage/async-storage";
import { Notice } from "../api/notices";

const CACHE = "mealplanner:notices:v1:feed";
const FETCHED = "mealplanner:notices:v1:last-success";
const READ = "mealplanner:notices:v1:read";

export async function readNoticesCache(): Promise<Notice[] | null> {
  try { const raw = await AsyncStorage.getItem(CACHE); const value: unknown = raw ? JSON.parse(raw) : null; return Array.isArray(value) ? value as Notice[] : null; }
  catch { return null; }
}
export async function writeNoticesCache(notices: Notice[], at: number): Promise<void> {
  try { await AsyncStorage.multiSet([[CACHE, JSON.stringify(notices)], [FETCHED, String(at)]]); } catch { /* Cache is optional. */ }
}
export async function readNoticesFetchedAt(): Promise<number | null> {
  try { const value = Number(await AsyncStorage.getItem(FETCHED)); return Number.isFinite(value) && value > 0 ? value : null; } catch { return null; }
}
export async function readNoticeIds(): Promise<Record<string, true>> {
  try { const value: unknown = JSON.parse((await AsyncStorage.getItem(READ)) ?? "{}"); if (!value || typeof value !== "object" || Array.isArray(value)) return {}; return Object.fromEntries(Object.entries(value).filter(([, v]) => v === true)) as Record<string, true>; } catch { return {}; }
}
export async function writeNoticeIds(ids: Record<string, true>): Promise<void> { try { await AsyncStorage.setItem(READ, JSON.stringify(ids)); } catch { /* Treat as unread next time. */ } }

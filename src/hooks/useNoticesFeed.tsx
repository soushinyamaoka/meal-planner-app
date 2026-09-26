import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { fetchNotices, Notice } from "../api/notices";
import { readNoticeIds, readNoticesCache, readNoticesFetchedAt, writeNoticeIds, writeNoticesCache } from "../utils/noticesCache";

const STALE_MS = 24 * 60 * 60 * 1000;
export function useNoticesFeed() {
  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [readIds, setReadIds] = useState<Record<string, true>>({});
  const [lastSuccessAt, setLastSuccessAt] = useState<number | null>(null);
  const [fetchFailed, setFetchFailed] = useState(true);
  const [clock, setClock] = useState(Date.now());
  const busy = useRef(false), started = useRef(0), mounted = useRef(true);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadCache = useCallback(async () => {
    const [cached, at, read] = await Promise.all([readNoticesCache(), readNoticesFetchedAt(), readNoticeIds()]);
    if (!mounted.current) return;
    if (cached) setNotices(cached); setLastSuccessAt(at); setReadIds(read);
  }, []);
  const refresh = useCallback(async (force = false) => {
    const now = Date.now();
    if (busy.current || (!force && started.current && now - started.current < 30_000)) return;
    busy.current = true; started.current = now;
    try {
      const result = await fetchNotices();
      await writeNoticesCache(result, Date.now());
      const ids = await readNoticeIds(), valid = new Set(result.map(n => n.notice_id));
      const trimmed = Object.fromEntries(Object.entries(ids).filter(([id]) => valid.has(id))) as Record<string, true>;
      await writeNoticeIds(trimmed);
      if (mounted.current) { setNotices(result); setLastSuccessAt(Date.now()); setReadIds(trimmed); setFetchFailed(false); }
    } catch { if (mounted.current) setFetchFailed(true); }
    finally { busy.current = false; }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void loadCache().finally(() => { void refresh(true); });
    const startTimer = (): void => { if (interval.current === null) interval.current = setInterval(() => { setClock(Date.now()); void refresh(false); }, 300_000); };
    const stopTimer = (): void => { if (interval.current !== null) { clearInterval(interval.current); interval.current = null; } };
    if (AppState.currentState === "active") startTimer();
    let previous: AppStateStatus = AppState.currentState;
    const subscription = AppState.addEventListener("change", state => {
      if (state !== "active") stopTimer();
      if (previous !== "active" && state === "active") { setClock(Date.now()); startTimer(); void refresh(false); }
      previous = state;
    });
    return () => { mounted.current = false; stopTimer(); subscription.remove(); };
  }, [loadCache, refresh]);
  const visibleNotices = useMemo(() => (notices ?? []).filter(n => Date.parse(n.visible_from) <= clock && clock < Date.parse(n.visible_until)), [notices, clock]);
  const unreadCount = visibleNotices.filter(n => !readIds[n.notice_id]).length;
  const stale = lastSuccessAt !== null && clock - lastSuccessAt > STALE_MS;
  const opened = useRef<Record<string, true>>({});
  const markVisibleRead = useCallback(() => {
    opened.current = Object.fromEntries(visibleNotices.filter(n => !readIds[n.notice_id]).map(n => [n.notice_id, true]));
    const next = { ...readIds, ...Object.fromEntries(visibleNotices.map(n => [n.notice_id, true])) } as Record<string, true>;
    setReadIds(next); void writeNoticeIds(next);
  }, [visibleNotices, readIds]);
  const isNewAtOpen = useCallback((id: string) => !!opened.current[id], []);
  return { notices: visibleNotices, unreadCount, stale, lastSuccessAt, fetchFailed, hasCache: notices !== null, refresh: () => refresh(true), markVisibleRead, isNewAtOpen };
}

import * as SecureStore from 'expo-secure-store';

const KEY_TOKEN = 'coop_api_token';
const KEY_COOP_URL = 'coop_api_url';
const KEY_WEB_URL = 'web_api_url';

// 初期値は環境変数から取得（初回起動時のみ SecureStore に書き込まれる）
const INITIAL_TOKEN = process.env.EXPO_PUBLIC_COOP_API_TOKEN ?? '';
const INITIAL_COOP_URL = process.env.EXPO_PUBLIC_COOP_API_URL ?? '';
const INITIAL_WEB_URL = process.env.EXPO_PUBLIC_WEB_API_URL ?? '';

export async function getCoopConfig(): Promise<{ url: string; token: string }> {
  const storedToken = await SecureStore.getItemAsync(KEY_TOKEN);
  const storedUrl = await SecureStore.getItemAsync(KEY_COOP_URL);

  const token = storedToken ?? INITIAL_TOKEN;
  // 初回起動時に保存された平文httpの接続先は、HTTPS移行により到達不可となる。
  // 既定値がhttpsの場合に限り失効とみなし、環境変数由来の既定へ移行する。
  // （利用者がhttpsで独自設定した値は保持する）
  const isStale =
    !!storedUrl && storedUrl.startsWith('http://') && INITIAL_COOP_URL.startsWith('https://');
  const url = !storedUrl || isStale ? INITIAL_COOP_URL : storedUrl;

  if (!storedToken) await SecureStore.setItemAsync(KEY_TOKEN, token);
  if (!storedUrl || isStale) await SecureStore.setItemAsync(KEY_COOP_URL, url);

  return { url, token };
}

/** 環境変数（.env）由来の初期値。設定画面の「初期値に戻す」で使用 */
export function getDefaultApiSettings(): { coopUrl: string; coopToken: string; webUrl: string } {
  return { coopUrl: INITIAL_COOP_URL, coopToken: INITIAL_TOKEN, webUrl: INITIAL_WEB_URL };
}

export async function getWebApiUrl(): Promise<string> {
  const storedUrl = await SecureStore.getItemAsync(KEY_WEB_URL);
  // 初回起動時に保存された平文httpの接続先は、HTTPS移行により到達不可となる。
  // 既定値がhttpsの場合に限り失効とみなし、環境変数由来の既定へ移行する。
  // （利用者がhttpsで独自設定した値は保持する）
  const isStale =
    !!storedUrl && storedUrl.startsWith('http://') && INITIAL_WEB_URL.startsWith('https://');
  const url = !storedUrl || isStale ? INITIAL_WEB_URL : storedUrl;
  if (!storedUrl || isStale) await SecureStore.setItemAsync(KEY_WEB_URL, url);
  return url;
}

export async function setCoopToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_TOKEN, token);
}

export async function setCoopUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_COOP_URL, url);
}

export async function setWebApiUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_WEB_URL, url);
}

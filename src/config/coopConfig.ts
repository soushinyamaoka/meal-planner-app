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
  const url = storedUrl ?? INITIAL_COOP_URL;

  if (!storedToken) await SecureStore.setItemAsync(KEY_TOKEN, token);
  if (!storedUrl) await SecureStore.setItemAsync(KEY_COOP_URL, url);

  return { url, token };
}

/** 環境変数（.env）由来の初期値。設定画面の「初期値に戻す」で使用 */
export function getDefaultApiSettings(): { coopUrl: string; coopToken: string; webUrl: string } {
  return { coopUrl: INITIAL_COOP_URL, coopToken: INITIAL_TOKEN, webUrl: INITIAL_WEB_URL };
}

export async function getWebApiUrl(): Promise<string> {
  const storedUrl = await SecureStore.getItemAsync(KEY_WEB_URL);
  const url = storedUrl ?? INITIAL_WEB_URL;
  if (!storedUrl) await SecureStore.setItemAsync(KEY_WEB_URL, url);
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

// 保育園献立インポートスクリプト
//
// 使い方:
//   node --env-file=.env scripts/importNurseryMenu.mjs <parsed.json> [--dry-run]
//
// <parsed.json> は { year, month, days: { "YYYY-MM-DD": { menu: string[], snack: string[] } } } の形式。
// Claudeがチャット内でPDFを目視解析して作成する（コード側に自動解析ロジックは持たない）。
//
// 認証は firebase-admin ではなく、既存アプリと同じクライアントSDK
// （signInWithEmailAndPassword、useAuth.tsx と同じ方式）を使う。
// これにより新しい種類の強力な秘密情報（サービスアカウントキー）を増やさずに済む。
//
// 注意: src/config/firebaseConfig.ts は React Native専用の
// AsyncStorage永続化に依存しているため、Nodeからそのままimportできない。
// ここでは同じfirebaseConfig値を使い、Node向けの最小構成で個別に初期化する。

import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

function fail(message) {
  console.error(`[importNurseryMenu] エラー: ${message}`);
  process.exit(1);
}

function getErrorCode(error) {
  return error && typeof error === "object" && typeof error.code === "string"
    ? ` (${error.code})`
    : "";
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidDateKey(dateKey, year, month) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return false;

  const keyYear = Number(match[1]);
  const keyMonth = Number(match[2]);
  const keyDay = Number(match[3]);
  const date = new Date(Date.UTC(keyYear, keyMonth - 1, keyDay));

  return keyYear === year
    && keyMonth === month
    && date.getUTCFullYear() === keyYear
    && date.getUTCMonth() + 1 === keyMonth
    && date.getUTCDate() === keyDay;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

const args = process.argv.slice(2);
const jsonPath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!jsonPath) {
  fail("JSONファイルのパスを指定してください。例: node --env-file=.env scripts/importNurseryMenu.mjs parsed.json");
}

const {
  EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID,
  NURSERY_IMPORTER_EMAIL,
  NURSERY_IMPORTER_PASSWORD,
} = process.env;

if (!dryRun) {
  if (!EXPO_PUBLIC_FIREBASE_API_KEY || !EXPO_PUBLIC_FIREBASE_PROJECT_ID) {
    fail(".envにFirebase設定(EXPO_PUBLIC_FIREBASE_*)が見つかりません。");
  }
  if (!NURSERY_IMPORTER_EMAIL || !NURSERY_IMPORTER_PASSWORD) {
    fail(".envにNURSERY_IMPORTER_EMAIL / NURSERY_IMPORTER_PASSWORDを設定してください。");
  }
}

let parsed;
try {
  parsed = JSON.parse(readFileSync(jsonPath, "utf-8"));
} catch (e) {
  fail(`JSONの読み込みに失敗しました: ${e.message}`);
}

const { year, month, days } = parsed;
if (!Number.isInteger(year) || year < 1000 || year > 9999
  || !Number.isInteger(month) || month < 1 || month > 12
  || !isRecord(days)) {
  fail("JSONの形式が不正です。{ year, month, days: {...} } である必要があります。");
}

const dateKeys = Object.keys(days).sort();
if (dateKeys.length === 0) {
  fail("daysが空です。取り込む日付がありません。");
}

for (const dateKey of dateKeys) {
  const day = days[dateKey];
  if (!isValidDateKey(dateKey, year, month)) {
    fail(`日付キーが対象年月の有効な日付ではありません: ${dateKey}`);
  }
  if (!isRecord(day) || !isStringArray(day.menu) || !isStringArray(day.snack)) {
    fail(`${dateKey}の形式が不正です。menuとsnackは文字列配列である必要があります。`);
  }
}

console.log(`\n=== ${year}年${month}月分 給食献立インポート ===`);
console.log(`対象日数: ${dateKeys.length}件`);
for (const dateKey of dateKeys) {
  const day = days[dateKey];
  console.log(`\n${dateKey}`);
  console.log(`  menu : ${day.menu.join(" / ")}`);
  console.log(`  snack: ${day.snack.join(" / ")}`);
}

if (dryRun) {
  console.log("\n--dry-run のため書き込みは行いません。");
  process.exit(0);
}

const firebaseConfig = {
  apiKey: EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

try {
  await signInWithEmailAndPassword(auth, NURSERY_IMPORTER_EMAIL, NURSERY_IMPORTER_PASSWORD);
} catch (e) {
  fail(`サインインに失敗しました${getErrorCode(e)}`);
}

if (!auth.currentUser) {
  fail("サインイン後のユーザー情報を取得できませんでした。");
}
const uid = auth.currentUser.uid;
let userSnap;
try {
  userSnap = await getDoc(doc(db, "users", uid));
} catch (e) {
  fail(`世帯情報の取得に失敗しました${getErrorCode(e)}`);
}
if (!userSnap.exists() || typeof userSnap.data().householdId !== "string" || !userSnap.data().householdId) {
  fail("ログインユーザーのhouseholdIdが見つかりません。アプリでhousehold作成/参加が完了しているか確認してください。");
}
const householdId = userSnap.data().householdId;

console.log("\n対象世帯のnurseryMenusへ書き込みます...");

for (const dateKey of dateKeys) {
  const day = days[dateKey];
  const ref = doc(db, `households/${householdId}/nurseryMenus`, dateKey);
  try {
    await setDoc(ref, { menu: day.menu, snack: day.snack });
  } catch (e) {
    fail(`${dateKey}の書き込みに失敗しました${getErrorCode(e)}`);
  }
  console.log(`  書き込み完了: ${dateKey}`);
}

console.log(`\n✅ ${dateKeys.length}件を書き込みました。`);
process.exit(0);

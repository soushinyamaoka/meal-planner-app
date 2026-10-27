// AI献立提案インポートスクリプト
//
// 使い方:
//   node --env-file=.env scripts/importMealProposal.mjs [提案ファイル.json ...] [--dry-run]
//
// ファイルを指定しないときは、受け取りフォルダ（inbox）の *.json をすべて処理する。
// 受け取りフォルダの場所は MEAL_PROPOSAL_DIR（未指定なら meal-planner/data/meal-proposals）の inbox。
// 形式は docs/MEAL_PROPOSAL_FORMAT.md。Codex が書いたファイルを、タスクスケジューラから定期実行して取り込む想定。
//
// 結果:
//   - 取り込めたファイルは imported/ へ移す。
//   - 形式エラー、または採用済みの提案を置き換えようとしたファイルは rejected/ へ移し、理由を <名前>.error.txt に書く。
//   - 通信などで書き込めなかったファイルは inbox に残し（次回に再試行）、終了コード1にする。
//   - --dry-run では、チェックと内容の表示だけを行い、書き込みもファイル移動もしない。
//
// 認証は importNurseryMenu.mjs と同じ（クライアントSDK＋NURSERY_IMPORTER_EMAIL/PASSWORD）。
// サービスアカウントキーは使わない。

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { validateMealProposal } from "./mealProposalFormat.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const baseDir = process.env.MEAL_PROPOSAL_DIR || path.resolve(scriptDir, "../../../data/meal-proposals");
const inboxDir = path.join(baseDir, "inbox");

function fail(message) {
  console.error(`[importMealProposal] エラー: ${message}`);
  process.exit(1);
}

function getErrorCode(error) {
  return error && typeof error === "object" && typeof error.code === "string" ? ` (${error.code})` : "";
}

function moveTo(file, folder, errorText) {
  const dir = path.join(baseDir, folder);
  mkdirSync(dir, { recursive: true });
  // 日本時間の YYYYMMDDTHHmmss
  const stamp = new Date(Date.now() + 9 * 3_600_000).toISOString().replace(/[-:]/g, "").replace(/\..*$/, "");
  const target = path.join(dir, `${path.basename(file, ".json")}_${stamp}.json`);
  renameSync(file, target);
  if (errorText) writeFileSync(target.replace(/\.json$/, ".error.txt"), `${errorText}\n`, "utf-8");
  return target;
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const unknownOptions = args.filter((a) => a.startsWith("--") && a !== "--dry-run");
if (unknownOptions.length > 0) fail(`知らないオプションです: ${unknownOptions.join(" ")}`);

let files = args.filter((a) => !a.startsWith("--")).map((a) => path.resolve(a));
if (files.length === 0) {
  if (!existsSync(inboxDir)) {
    console.log(`受け取りフォルダがありません（${inboxDir}）。取り込むものはありません。`);
    process.exit(0);
  }
  files = readdirSync(inboxDir).filter((name) => name.endsWith(".json")).sort().map((name) => path.join(inboxDir, name));
}
if (files.length === 0) {
  console.log("取り込む提案ファイルはありません。");
  process.exit(0);
}

// 1. 形式チェック（Firestoreに接続する前に、すべてのファイルを見る）
const accepted = [];
let rejectedCount = 0;
for (const file of files) {
  console.log(`\n=== ${path.basename(file)} ===`);
  let data;
  let errors;
  try {
    data = JSON.parse(readFileSync(file, "utf-8").replace(/^﻿/, ""));
    errors = validateMealProposal(data);
  } catch (e) {
    errors = [`JSONとして読めません: ${e.message}`];
  }
  // ファイル名の決まりは受け取りフォルダのファイルにだけ求める（見本などを指定してチェックできるように）
  if (errors.length === 0 && path.dirname(file) === inboxDir && path.basename(file) !== `${data.proposalId}.json`) {
    errors.push(`ファイル名は <proposalId>.json（${data.proposalId}.json）にしてください`);
  }
  if (errors.length > 0) {
    errors.forEach((message) => console.log(`  ✗ ${message}`));
    rejectedCount += 1;
    if (!dryRun) console.log(`  → rejected へ移しました: ${moveTo(file, "rejected", errors.join("\n"))}`);
    continue;
  }
  console.log(`期間: ${data.periodStart}〜${data.periodEnd}（作成 ${data.createdAt}）`);
  if (data.comment) console.log(`ひとこと: ${data.comment}`);
  for (const day of [...data.days].sort((a, b) => a.date.localeCompare(b.date))) {
    console.log(`  ${day.date}: ${day.dishes.map((dish) => `${dish.name}(${dish.role})`).join(" / ")}`);
  }
  accepted.push({ file, data });
}

if (dryRun) {
  console.log(`\n--dry-run のため書き込みは行いません（合格 ${accepted.length}件、不合格 ${rejectedCount}件）。`);
  process.exit(rejectedCount > 0 ? 1 : 0);
}
if (accepted.length === 0) {
  console.log(`\n取り込めるファイルはありませんでした（不合格 ${rejectedCount}件）。`);
  process.exit(rejectedCount > 0 ? 1 : 0);
}

// 2. Firestoreへの書き込み
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
if (!EXPO_PUBLIC_FIREBASE_API_KEY || !EXPO_PUBLIC_FIREBASE_PROJECT_ID) fail(".envにFirebase設定(EXPO_PUBLIC_FIREBASE_*)が見つかりません。");
if (!NURSERY_IMPORTER_EMAIL || !NURSERY_IMPORTER_PASSWORD) fail(".envにNURSERY_IMPORTER_EMAIL / NURSERY_IMPORTER_PASSWORDを設定してください。");

const app = initializeApp({
  apiKey: EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: EXPO_PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

try {
  await signInWithEmailAndPassword(auth, NURSERY_IMPORTER_EMAIL, NURSERY_IMPORTER_PASSWORD);
} catch (e) {
  fail(`サインインに失敗しました${getErrorCode(e)}`);
}
if (!auth.currentUser) fail("サインイン後のユーザー情報を取得できませんでした。");
let userSnap;
try {
  userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
} catch (e) {
  fail(`世帯情報の取得に失敗しました${getErrorCode(e)}`);
}
const householdId = userSnap.exists() ? userSnap.data().householdId : null;
if (typeof householdId !== "string" || !householdId) {
  fail("ログインユーザーのhouseholdIdが見つかりません。アプリでhousehold作成/参加が完了しているか確認してください。");
}

let failedCount = 0;
let importedCount = 0;
for (const { file, data } of accepted) {
  const ref = doc(db, `households/${householdId}/mealProposals`, data.proposalId);
  try {
    const existing = await getDoc(ref);
    const adoptions = existing.exists() ? existing.data().adoptions : null;
    if (adoptions && typeof adoptions === "object" && Object.keys(adoptions).length > 0) {
      const reason = `同じ期間の提案（${data.proposalId}）で、すでに採用された料理があるため置き換えません。`;
      console.log(`\n${path.basename(file)}: ✗ ${reason}`);
      rejectedCount += 1;
      console.log(`  → rejected へ移しました: ${moveTo(file, "rejected", reason)}`);
      continue;
    }
    // JSONから読んだ値なので undefined は含まれない。アプリ側の状態を初期値で付ける
    await setDoc(ref, { ...data, status: "new", adoptions: {}, importedAt: serverTimestamp() });
    importedCount += 1;
    console.log(`\n${path.basename(file)}: ✅ ${existing.exists() ? "置き換えました" : "取り込みました"}`);
    console.log(`  → imported へ移しました: ${moveTo(file, "imported")}`);
  } catch (e) {
    failedCount += 1;
    console.error(`\n${path.basename(file)}: 書き込みに失敗しました${getErrorCode(e)}。inbox に残し、次回に再試行します。`);
  }
}

console.log(`\n完了: 取り込み ${importedCount}件、書き込み失敗 ${failedCount}件、不合格 ${rejectedCount}件。`);
process.exit(failedCount > 0 || rejectedCount > 0 ? 1 : 0);

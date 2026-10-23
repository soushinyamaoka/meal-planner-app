# Client Release Plan

record_type: client_release
client_release_id: 20261023-MEALPLANNER-001
app: meal-planner-app
status: delivered
source_commit: 25f13ac7d4bbd3fd90c4c74fdabfe0653538a74e
distribution_status: published
release_gate: user_approved
server_change_notice: なし（本releaseはクライアントのみ。サーバー・APIの変更はない）

## 配信対象

Expo SDK 57 → 58 のアップグレード（`25f13ac`）。

- **理由（急ぎ）**: App Storeの Expo Go が SDK 58 に更新され、iOS（Expo Goで `default` channel を読む端末）で、SDK 57 のアプリが開けなくなった（app ownerの報告: 家族のiPhoneでアプリが開けない）。新しい Expo Go は SDK 58 だけに対応する。
- 依存関係: `npx expo install expo@^58.0.0` と `npx expo install --fix` で更新。expo 58、react-native 0.86.3 → 0.88.0、react 19.2.3 → 19.3.0、expo-* と `babel-preset-expo` を 58 系に、`@types/react` を 19.3 系に。
- 破壊的変更への対応（動作は変えない、型のみ）: RN 0.88 の厳格な TypeScript API に合わせ、`ScrollView` の ref を `ScrollViewInstance` 型に（`src/components/AiMealPrompt.tsx`, `src/tabs/NurseryMenuTab.tsx`）。`AppState.currentState` の型変更（`string | null | undefined`）に合わせる（`src/hooks/useNoticesFeed.tsx`）。
- `app.config.js`・`eas.json`・`tsconfig.json` は変更なし。

## 配布経路

- 実施主体: Claude（アプリ側チャット）。app ownerが2026-10-23に、まず「main反映」と「`default` channel への配信」だけを行うよう明示承認した（「まずは1.2だけにしましょう」）。
- 方式: EAS Update（OTA）。`--environment preview`。**channel: `default` のみ**（iOS Expo Go向け）。
- runtime: **`exposdk:58.0.0`**（`runtimeVersion.policy: sdkVersion` のため、前回の `exposdk:57.0.0` から変わる）。platform: android, ios。
- **native変更: あり**（SDK・React Nativeの更新）。そのため、インストール済みのAndroid APK（SDK 57、`android-internal` channel）にはOTAで届かない。Androidは、EAS BuildでAPKを作り直して入れ直す必要がある（本releaseでは未実施。app ownerの指示待ち）。それまではAndroidの既存APK（SDK 57）がそのまま動く。
- アップロード対象: `.env` はgit除外済み。`.easignore` は無し。秘密値は含まれない。

## Serverとの前後関係

サーバー・APIの変更を伴わない。

## 配信前確認

- `npx expo-doctor@latest`: 20/20 checks passed。
- `npm run typecheck`: 終了コード0。
- `expo export` のバンドル: android・ios とも成功。
- `react-native-keyboard-aware-scroll-view`（0.9.5）が使う `findNodeHandle`・`UIManager`・`TextInput.State` が RN 0.88 に残っていることをソースで確認。
- react-native の `SafeAreaView` は 0.88 で非推奨（開発時に警告。動作はする）。今回は変更しない。
- 実機での確認: **未実施**。配信後に確認する。

## 直前の安定版・rollback

- `default` channel の直前の配信（`20261010-MEALPLANNER-001`）: `9f06716e-8905-4d54-bfb9-869502ec1010`（runtime `exposdk:57.0.0`）。ただし、SDK 58 の Expo Go では SDK 57 の版は開けないため、iOSについては戻し先にならない。不具合時は、SDK 58 のまま修正版を配信する。
- Android（`android-internal`）は本releaseで変更しない。

## 配信後の記録

配信日: 2026-10-23 JST。実施主体: Claude（app ownerの明示承認後）。配信時のworking treeはclean、`git` HEAD `e2a929c` は実remote mainと一致し、`25f13ac..e2a929c` のops以外の差分は無し。

| channel | update group ID | runtime | platform |
|---|---|---|---|
| default | `e72c78f1-ea39-4bcb-b813-41e89c0d616f` | `exposdk:58.0.0` | android, ios |

- Androidのupdate ID: `01a16673-7e1f-76e1-85fa-d67f67ae973f`。iOSのupdate ID: `01a16673-7e1f-7539-a149-42734a2dbdf4`。
- EAS environment: `preview`。`--non-interactive`。exit 0。
- **端末確認: 未実施**。確認する項目: ①iPhoneの Expo Go（SDK 58）でアプリが開けること（Expo Goを完全に閉じて開き直す）、②ログイン後、献立・レシピ・給食・COOPの各タブが表示されること、③レシピ編集画面とAI相談の入力欄で、キーボードが入力欄を隠さないこと、④お知らせが表示されること。
- 結果（iOS）: iOS向けの配信は完了。app ownerが2026-10-23に、家族のiPhoneで問題ないことを確認した。

### Android（2026-10-23 追記）

app ownerが iOS の動作確認後に、Androidの対応を明示承認した（「問題なさそうです。Androidもお願いします」）。

- **EAS Build**: profile `android-internal`（APK、distribution internal、channel `android-internal`）。build ID `bf8ff700-8e63-4af1-af3e-202b1bdf6c17`、status FINISHED、runtime `exposdk:58.0.0`、sdk `58.0.0`、gitCommitHash `31280d6`（実remote mainと一致、working tree clean）。appVersion `1.0.0`、versionCode `1`。署名はEAS管理の既存keystore（上書きインストール可能）。ビルド時、EASは「partial outage」を表示していたが、ビルドは成功。
- **EAS Update**:

| channel | update group ID | runtime | platform |
|---|---|---|---|
| android-internal | `9b544842-e81a-4e10-9bc2-817054c76eba` | `exposdk:58.0.0` | android, ios |

- Androidのupdate ID: `01a16680-55fa-7930-a008-343d8fff22f0`。iOSのupdate ID: `01a16680-55fa-736c-8c7e-cc516d2b90e6`。`--environment preview`、`--non-interactive`、exit 0。
- **端末確認: 未実施**。新しいAPKを既存アプリの上からインストールした後に確認する: ①アプリが開き、ログイン状態が保たれていること、②各タブの表示、③キーボードが入力欄を隠さないこと（`react-native-keyboard-aware-scroll-view` が RN 0.88 で動くか）、④R8（release buildで既定有効）による不具合がないこと（Firebaseの読み書き、COOP API、お知らせ）。
- 既存のSDK 57のAPKのままの端末には、本release以降のOTAは届かない。

## 承認と状態

- app owner: 2026-10-23に、main反映と `default` channel への配信を明示承認。その後、iOS確認を経てAndroid（EAS Build・`android-internal`）も承認。
- VPS management review: クライアントのみの変更で、サーバー変更通知は不要。
- VPS production approval: 該当する操作なし。
- client distribution: published（2026-10-23。`default`: iOS端末確認済み。`android-internal`: EAS Build＋配信済み、APKの入れ直しと端末確認は未実施）。

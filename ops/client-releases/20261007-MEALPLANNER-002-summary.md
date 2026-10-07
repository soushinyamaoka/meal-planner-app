# Client Release Plan

record_type: client_release
client_release_id: 20261007-MEALPLANNER-002
app: meal-planner-app
status: delivered
source_commit: aec5523cf8b7952e36a6e0fbd19c9dacc2674092
distribution_status: published
release_gate: user_approved
server_change_notice: なし（本releaseはクライアントのみ。サーバー・APIの変更はない）

## 配信対象

前回配信（`20261007-MEALPLANNER-001`、source `36c79c0`）の修正が、実機で効かなかったため、「AIに献立を相談」の入力欄（「ほかに使いたい食材」「補足」「AIの回答を貼り付け」）が、キーボードに隠れて入力できない不具合を、別の方法で直す。

- **前回の修正が効かなかった原因**: 前回は、他の画面と同じ `KeyboardAwareScrollView` に変えた。このライブラリは、Androidでは「システムが入力欄をキーボードの上まで動かす」ことを前提に、残りの数十pxだけをスクロールする（ライブラリの実装に、そう書かれている）。このアプリの Expo SDK 57 のAndroidは、エッジ・トゥ・エッジ表示で、キーボードが開いても画面が縮まず、システムも入力欄を動かさない。そのため、少しだけ動いて止まり、貼り付け欄が隠れたままだった（実機のスクリーンショットで確認）。
- **今回の修正**: ライブラリやシステムの動きに頼らず、画面側で処理する。
  1. `Keyboard` のイベント（`keyboardDidShow`・`keyboardDidHide`）でキーボードの高さを受け取り、その高さの余白を、画面の下に足す（下の入力欄も、上まで動かせるようにするため）。
  2. 入力欄をタップしたら、その欄を画面の上端（見出しが見える位置）までスクロールする。キーボードが開いた後、および、別の欄へ移ったときに動かす。
  3. スクロール領域は、通常の `ScrollView` に戻す。読み取り後にプレビューへ画面を送る処理は、従来どおり。

## 配布経路

- 実施主体: Claude（アプリ側チャット）。app ownerが2026-10-07に配信を明示承認した（「配信して良いです」）。
- 方式: EAS Update（OTA）。`--environment preview`。channel: `android-internal` と `default` の両方。
- runtime: `exposdk:57.0.0`（前回配信と同一）。platform: android, ios。
- native変更: なし。`package.json`・`package-lock.json`・`app.config.js`・`eas.json` は前回配信の最終コード（`36c79c0`）から差分なし。新しい依存の追加もない（`Keyboard` は `react-native` 標準）。
- 変更ファイル（前回配信のコードからのops・docs以外）: `src/components/AiMealPrompt.tsx` のみ。
- アップロード対象: `.env` はgit除外済み。`.easignore` は無し。秘密値は含まれない。

## Serverとの前後関係

サーバー・APIの変更を伴わない。

## 配信前確認

- `npm run typecheck`: 終了コード0。`expo export --platform android` のバンドルも成功。作業ツリーclean。
- ライブラリ（`react-native-keyboard-aware-scroll-view`）の実装を読み、前回の修正がAndroidで効かない理由（システムが動かす前提で、残りの高さだけを動かす）を確認した。
- 実機での確認: **未実施**（画面の動きは実機でしか確かめられない。前回は、確認せずに配信して、効かなかった）。配信後に確認する。

## 直前の安定版・rollback

- 直前の配信（`20261007-MEALPLANNER-001`、2026-10-07配信。キーボードの修正を含むが、効かなかった）: android-internal `a95bd738-16d1-4737-8392-b0d90843a4a9` / default `531d7753-44af-40d7-90a2-c36c8470c256`。
- rollback: 上記、または1つ前（`20261005-MEALPLANNER-002`: android-internal `e6903569-09ac-4e5e-a09a-d9aada4fb12a` / default `267f5e92-ad5c-4b4b-924b-73378be19d57`）を、同じchannelへ再配信する（`eas update:republish`）。次回起動以降に切り替わる。データへの影響はない。

## 配信後の記録

配信日: 2026-10-07 JST。実施主体: Claude（app ownerの明示承認後）。配信時のworking treeはclean、`git` HEAD `e28ddae` は実remote mainと一致し、`aec5523..e28ddae` のops・docs以外の差分は無し。

| channel | update group ID | runtime | platform |
|---|---|---|---|
| android-internal | `628364d6-92f3-4075-a291-1c514f74cb62` | `exposdk:57.0.0` | android, ios |
| default | `c79f07b9-afe2-4e98-8a0e-12effa3e078b` | `exposdk:57.0.0` | android, ios |

- Androidのupdate ID: android-internal `01a1145e-5982-72fe-93e0-6d6c2d011a11` / default `01a1145f-1081-70b5-b96c-f92d2eced44a`。iOSのupdate ID: android-internal `01a1145e-5982-71cd-836c-589a838d227b` / default `01a1145f-1081-75eb-ac54-5956ae3db14d`。
- EAS environment: `preview`。`--non-interactive`。どちらもexit 0。
- **端末確認: 未実施**。確認する項目: ①アプリを完全に閉じて開き直し、新しいbundleが適用されること、②COOPタブ →「AIに献立を相談」で、「AIの回答を貼り付け」欄をタップすると、キーボードが開いた後、欄が画面の上端付近までスクロールし、入力欄がキーボードに隠れないこと。貼り付け・追記ができること、③「補足」「ほかに使いたい食材」の欄でも同様であること、④ある欄を入力中に、別の欄をタップしても、その欄が見えること、⑤キーボードを閉じると、下に足した余白が消えて、画面が元の長さに戻ること、⑥長い回答を貼り付けた状態で、末尾に追記できること、⑦「読み取る」を押すと、キーボードが閉じて、プレビューの位置まで画面が送られること、⑧一覧へ戻っても入力が残ること（前回までの動作が変わっていないこと）。
- 動作が不十分な場合の情報として、確認時に、使った端末（Android/iOS）とキーボードの種類を控える。
- Expo Go（iOS）は `default`、Android実機は `android-internal` を読む。新しいbundleに切り替わるのは次回起動以降。
- 結果: 「アプリ側の配信は完了／端末確認は未実施」。

## 承認と状態

- app owner: 2026-10-07に配信を明示承認。
- VPS management review: クライアントのみの変更で、サーバー変更通知は不要。
- VPS production approval: 該当する操作なし。
- client distribution: published（2026-10-07、EAS Update両channel。端末確認は未実施）。

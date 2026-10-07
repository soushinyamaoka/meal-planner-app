# Client Release Plan

record_type: client_release
client_release_id: 20261007-MEALPLANNER-001
app: meal-planner-app
status: delivered
source_commit: 36c79c0cacb4b77752880b916c4fc7268aa70227
distribution_status: published
release_gate: user_approved
server_change_notice: なし（本releaseはクライアントのみ。サーバー・APIの変更はない）

## 配信対象

COOPタブの「AIに献立を相談」で、AIの回答の貼り付け欄などをタップすると、キーボードに隠れて入力できない不具合を直す（ユーザー報告）。

- 原因: この画面のスクロール領域が通常の `ScrollView` で、キーボードを避ける仕組みが無かった。貼り付け欄は画面の一番下にあるため、タップしてキーボードが開くと、欄がキーボードの後ろに隠れ、画面も動かなかった。
- 修正: 他の入力画面（ログイン、世帯設定、レシピの編集など）と同じ `KeyboardAwareScrollView`（`enableOnAndroid`、`extraScrollHeight=16`）に変える。タップした入力欄が、キーボードの上に出るよう自動でスクロールする。読み取り後にプレビューへ画面を送る処理は、`innerRef` 経由の `scrollTo` でそのまま動く。
- 影響する入力欄: 「ほかに使いたい食材」「補足」「AIの回答を貼り付け」。

## 配布経路

- 実施主体: Claude（アプリ側チャット）。app ownerが2026-10-07に配信を明示承認した（「良いです」）。
- 方式: EAS Update（OTA）。`--environment preview`。channel: `android-internal` と `default` の両方。
- runtime: `exposdk:57.0.0`（前回配信と同一）。platform: android, ios。
- native変更: なし。`package.json`・`package-lock.json`・`app.config.js`・`eas.json` は前回配信の最終コード（`9f71ca2`）から差分なし。`react-native-keyboard-aware-scroll-view` は、すでにアプリが使っている依存（新規追加ではない）。
- 変更ファイル（前回配信のコードからのops・docs以外）: `src/components/AiMealPrompt.tsx` のみ（6行追加・3行削除）。
- アップロード対象: `.env` はgit除外済み。`.easignore` は無し。秘密値は含まれない。

## Serverとの前後関係

サーバー・APIの変更を伴わない。

## 配信前確認

- `npm run typecheck`: 終了コード0。`expo export --platform android` のバンドルも成功。作業ツリーclean。
- 実機での確認: **未実施**（画面の動きは、実機でしか確認できない。配信後に確認する）。

## 直前の安定版・rollback

- 直前の安定版（`20261005-MEALPLANNER-002`、2026-10-07配信）: android-internal `e6903569-09ac-4e5e-a09a-d9aada4fb12a` / default `267f5e92-ad5c-4b4b-924b-73378be19d57`。
- rollback: 上記を同じchannelへ再配信する（`eas update:republish`）。次回起動以降に切り替わる。データへの影響はない（旧版は、貼り付け欄がキーボードに隠れる従来の動作に戻る）。

## 配信後の記録

配信日: 2026-10-07 JST。実施主体: Claude（app ownerの明示承認後）。配信時のworking treeはclean、`git` HEAD `ce34c94` は実remote mainと一致し、`36c79c0..ce34c94` のops・docs以外の差分は無し。

| channel | update group ID | runtime | platform |
|---|---|---|---|
| android-internal | `a95bd738-16d1-4737-8392-b0d90843a4a9` | `exposdk:57.0.0` | android, ios |
| default | `531d7753-44af-40d7-90a2-c36c8470c256` | `exposdk:57.0.0` | android, ios |

- Androidのupdate ID: android-internal `01a11453-58db-7f50-8fe2-3608b83442b1` / default `01a11453-fc33-779b-8872-8ab6af157961`。iOSのupdate ID: android-internal `01a11453-58db-761d-98a1-dfef110b7ec5` / default `01a11453-fc33-7e6a-bee8-a75324c4a86e`。
- EAS environment: `preview`。`--non-interactive`。どちらもexit 0。
- **端末確認: 未実施**。確認する項目: ①アプリを完全に閉じて開き直し、新しいbundleが適用されること、②COOPタブ →「AIに献立を相談」で、「AIの回答を貼り付け」欄をタップすると、画面が自動でスクロールし、欄がキーボードの上に表示されて入力（貼り付け・追記）できること、③「ほかに使いたい食材」「補足」の欄でも同様に、欄がキーボードに隠れないこと、④長い回答を貼り付けた状態で、末尾に追記できること、⑤「読み取る」を押すと、キーボードが閉じて、プレビューの位置まで画面が送られること（従来の動作が変わっていないこと）、⑥前回配信した入力の保持（一覧へ戻っても入力が残る）が引き続き動くこと。
- Expo Go（iOS）は `default`、Android実機は `android-internal` を読む。新しいbundleに切り替わるのは次回起動以降。
- 結果: 「アプリ側の配信は完了／端末確認は未実施」。

## 承認と状態

- app owner: 2026-10-07に配信を明示承認。
- VPS management review: クライアントのみの変更で、サーバー変更通知は不要。
- VPS production approval: 該当する操作なし。
- client distribution: published（2026-10-07、EAS Update両channel。端末確認は未実施）。

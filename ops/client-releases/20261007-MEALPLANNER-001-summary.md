# Client Release Plan

record_type: client_release
client_release_id: 20261007-MEALPLANNER-001
app: meal-planner-app
status: ready
source_commit: 36c79c0cacb4b77752880b916c4fc7268aa70227
distribution_status: approved
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

（配信後に、update group ID・配信時刻・端末確認結果を追記する）

## 承認と状態

- app owner: 2026-10-07に配信を明示承認。
- VPS management review: クライアントのみの変更で、サーバー変更通知は不要。
- VPS production approval: 該当する操作なし。
- client distribution: approved（配信前）。

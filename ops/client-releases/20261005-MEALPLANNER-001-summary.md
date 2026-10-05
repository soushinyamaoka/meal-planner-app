# Client Release Plan

record_type: client_release
client_release_id: 20261005-MEALPLANNER-001
app: meal-planner-app
status: ready
source_commit: 197de82af147059a251b5a7bc3ff1935a31e1e3a
distribution_status: approved
release_gate: user_approved
server_change_notice: coop-apiリポジトリの ops/server-change-notices/20261005-COOPAPI-007-summary.md（本番反映済み・VPS管理が確認）

## 配信対象

COOPの注文の日付を、メール受信日から、注文確認メール本文の「翌週商品配達予定日」へ変えたサーバー側の変更（通知007）に、アプリの表示を合わせる。Codex task `20261005-013`。

- 日付の見出し: APIの `order_date_source` に応じて切り替える。`delivery_schedule` は「お届け予定日」、`email_date` は「メール受信日」、`import_time` は「取り込み日」。項目が無い・`null`（旧データ）は従来どおり「注文日」。
- 日付の書き方: 「9/30(水)」の形。
- 金額: 注文の合計金額（税込）を「合計 N円（税込）」と表示する。COOPタブの注文情報と、「過去の注文」の各カードに出す。金額が無い場合は表示しない。

## 配布経路

- 実施主体: Claude（アプリ側チャット）。app ownerが2026-10-05に配信を明示承認した（「アプリ配信へ進めます」）。
- 方式: EAS Update（OTA）。`--environment preview`。channel: `android-internal` と `default` の両方。
- runtime: `exposdk:57.0.0`（前回配信と同一）。platform: android, ios。
- native変更: なし。`package.json`・`package-lock.json`・`app.config.js`・`eas.json` は前回配信の最終コード（`000cf1a`）から差分なし。新しいnative libraryは追加していない。
- 変更ファイル（前回配信のコードからのops以外）: `src/components/CoopOrderHistory.tsx`、`src/tabs/CoopTab.tsx`、`src/types/index.ts`、`src/utils/coopOrderFormatting.ts`（新規）。
- アップロード対象: `.env` はgit除外済み。`.easignore` は無し。秘密値は含まれない。

## Serverとの前後関係

- 通知007は本番反映済み。VPS管理の報告（2026-10-05）: 旧形式の注文履歴を整理した後に手動取得を実施し、最新注文の `order_date_source` が `delivery_schedule` であることを確認済み。本releaseは、サーバー反映・確認の**後**に配信する。
- アプリは、サーバーの新しい項目が無くても動く（旧データでは見出しは「注文日」、金額は非表示）。サーバーに旧形式のデータが残っていても壊れない。
- 旧端末版（本release未適用）は、新しい項目を無視する。日付は配達予定日になるが、見出しは「注文日」のまま、金額は表示されない。

## 配信前確認

- `npm run typecheck`: 終了コード0。作業ツリーclean。
- 表示用の関数（見出し・日付・金額）は、実行して確認済み: 見出し4種と未定義、`2026-09-30` → `9/30(水)`、`2026-12-31` → `12/31(木)`、不正な日付・空文字はそのまま表示、金額 `5400` → `5,400`、`1234567` → `1,234,567`、`0` → `0`、`null`・未定義・NaNは非表示。
- サーバー側（coop-api）は、実際の注文確認メール1通で、配達予定日・本体・税込の金額が本文の値と一致することを確認済み（通知007）。
- 実機での画面確認（COOPタブの「お届け予定日」と金額、「過去の注文」の日付と金額）: **未実施**（配信後に確認する）。

## 直前の安定版・rollback

- 直前の安定版（`20261004-MEALPLANNER-003`、2026-10-04配信）: android-internal `8f67c3ea-0f60-478b-88b0-ddff26abe38b` / default `7f1531e7-e412-40b5-9f24-dfa8d85b4d2b`。
- rollback: 上記を同じchannelへ再配信する（`eas update:republish`）。次回起動以降に切り替わる。rollbackしても、サーバー側のデータには影響しない。旧版は、日付は配達予定日になるが見出しは「注文日」で、金額は表示しない。

## 配信後の記録

（配信後に、update group ID・配信時刻・端末確認結果を追記する）

## 承認と状態

- app owner: 2026-10-05に配信を明示承認。
- VPS management review: クライアントのみの変更で、サーバー変更通知は不要（サーバー側は通知007として別管理・本番反映済み）。
- VPS production approval: 該当する操作なし。
- client distribution: approved（配信前）。

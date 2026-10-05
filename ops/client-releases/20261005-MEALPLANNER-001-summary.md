# Client Release Plan

record_type: client_release
client_release_id: 20261005-MEALPLANNER-001
app: meal-planner-app
status: delivered
source_commit: 197de82af147059a251b5a7bc3ff1935a31e1e3a
distribution_status: published
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

配信日: 2026-10-05 JST。実施主体: Claude（app ownerの明示承認後）。配信時のworking treeはclean、`git` HEAD `cbdac7f` は実remote mainと一致し、`197de82..cbdac7f` のops以外の差分は無し。

| channel | update group ID | runtime | platform |
|---|---|---|---|
| android-internal | `e422917f-3f18-4e54-8813-62281a793e45` | `exposdk:57.0.0` | android, ios |
| default | `e32d0d62-1e7c-405a-b0ed-beeb6e951258` | `exposdk:57.0.0` | android, ios |

- Androidのupdate ID: android-internal `01a10a39-77ad-7f1b-b48b-1023d0299958` / default `01a10a3a-1bde-735b-99b9-0558e5a83307`。iOSのupdate ID: android-internal `01a10a39-77ad-7bb9-8652-28cb0d8e7bfa` / default `01a10a3a-1bde-7d87-accb-4863e0b6cbd1`。
- EAS environment: `preview`。`--non-interactive`。どちらもexit 0。
- **端末確認: 未実施**。確認する項目: ①アプリを完全に閉じて開き直し、新しいbundleが適用されること、②COOPタブの注文情報が「お届け予定日: M/D(曜)」と表示され、日付が注文確認メールの「翌週商品配達予定日」と一致すること、③同じ行に「合計 N円（税込）」が表示され、金額がメールの合計金額（税込）と一致すること、④「過去の注文」の各カードにも、同じ見出しの日付と金額が出ること（商品一覧も開けること）、⑤サーバーが反映済みなので、見出しが「注文日」のままになっていないこと（「注文日」のままなら、最新注文が旧形式のままで、サーバー側の手動取得が反映されていない）。
- Expo Go（iOS）は `default`、Android実機は `android-internal` を読む。新しいbundleに切り替わるのは次回起動以降。
- 結果: 「アプリ側の配信は完了／端末確認は未実施」。

## 承認と状態

- app owner: 2026-10-05に配信を明示承認。
- VPS management review: クライアントのみの変更で、サーバー変更通知は不要（サーバー側は通知007として別管理・本番反映済み）。
- VPS production approval: 該当する操作なし。
- client distribution: published（2026-10-05、EAS Update両channel。端末確認は未実施）。

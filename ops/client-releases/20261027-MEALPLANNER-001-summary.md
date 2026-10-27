# Client Release Plan

record_type: client_release
client_release_id: 20261027-MEALPLANNER-001
app: meal-planner-app
status: delivered
source_commit: 6f2fcfddf5447efb3b45775dba295419bcc5d06f
distribution_status: published
release_gate: user_approved
server_change_notice: なし（本releaseはクライアントのみ。サーバー・APIの変更はない）

## 配信対象

AI献立提案の画面（`6f2fcfd`）。提案の形式・取り込みスクリプト（`f041cfc`）はPC側の仕組みで、アプリの配信物ではない。

- 献立タブの上に、AI献立提案のお知らせを出す。条件は、閉じられておらず、期間が終わっておらず、未採用の料理が残っている最新の提案があること（Firestore `households/{世帯}/mealProposals`）。
- 提案画面で料理を選び、追加する日（今日〜14日後）を決めて献立に反映する。既存の献立は残して追加する。レシピ一覧に同じ名前のレシピがあればそれを使い、無ければ献立専用レシピ（`showInList: false`）を作る。
- 採用した料理は、提案の `adoptions` に記録する（日付・レシピID・日時）。提案の `status` を opened / done / dismissed に更新する。
- **提案が1件も無いあいだは、画面は今と変わらない。** 現時点で本番に提案は無い（取り込みスクリプトは本番への書き込みが未実施）。
- Firestoreのルールは変更なし（世帯のサブコレクションの既存ルールに含まれる）。新しいクエリは `periodEnd` の単一フィールド範囲条件のみ（自動作成のインデックスで足りる）。

## 配布経路

- 実施主体: Claude（アプリ側チャット）。app ownerが、実機確認を「アプリだけ先に配信し、Codexの最初の本物の提案で確認する」案（おすすめ案B）で行うことを承認した（「おすすめで」）。
- 方式: EAS Update（OTA）。`--environment preview`。channel: `default` と `android-internal`。runtime `exposdk:58.0.0`。native変更なし。

## 配信前確認

- `npm run typecheck`: 終了コード0。`expo export`（android）: 成功。
- 反映処理（`buildProposalAppend`）をNodeで確認: 既存の献立を残して追加、同じ名前の料理はレシピを1つにまとめる、一覧の同名レシピを再利用、献立専用の同名レシピは再利用しない（AI相談と同じ）。
- 実機での確認: 未実施。最初の本物の提案が取り込まれた時に、取り込みスクリプトの本番書き込みと合わせて確認する。

## 直前の安定版・rollback

- `default`: `945ffff1-8e7e-4b85-a60d-d45e2778608d`。`android-internal`: `351d15de-8789-47c4-b95e-9867fb1835eb`（ともに 20261023-MEALPLANNER-002）。

## 配信後の記録

配信日: 2026-10-27 JST。実施主体: Claude。配信時の working tree は clean、HEAD `b05aba0` は実remote mainと一致。`--environment preview`、`--non-interactive`、どちらも exit 0。

| channel | update group ID | runtime | platform |
|---|---|---|---|
| default | `f2c2d162-971f-4ac7-89e5-362f4d6b2e8f` | `exposdk:58.0.0` | android, ios |
| android-internal | `520c2005-7264-41a1-b2cc-546cf039a482` | `exposdk:58.0.0` | android, ios |

- 端末確認: 未実施（提案が無いので画面の変化は無い）。最初の本物の提案を取り込んだ時に確認する項目: ①献立タブにお知らせが出る、②提案画面の表示（作り方の開閉、日付の変更）、③反映で献立に追加され「追加済み」になる、④Firestoreの \`adoptions\`・\`status\` が更新される、⑤「この提案を閉じる」でお知らせが消える。

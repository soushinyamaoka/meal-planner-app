# Client Release Plan

record_type: client_release
client_release_id: 20261027-MEALPLANNER-002
app: meal-planner-app
status: delivered
source_commit: 03784cd005bd1ebfe1920fc5243740240a739527
distribution_status: published
release_gate: user_approved
server_change_notice: なし（本releaseはクライアントのみ。サーバー・APIの変更はない）

## 配信対象

AI献立提案の画面の見た目の修正（`03784cd`）。

- 最初の本物の提案（2026-10-28〜11-03）で、日付を変えても料理が提案日の見出しの下に残り、変更が見た目で分からないとapp ownerから指摘があった。
- 料理を「入れる日（追加済みなら追加した日）」の見出しの下に並べる。日付を変えると、その日の見出しの下へ移動し、自動で選択状態になる。
- 移した料理には「〜の提案から移動・戻す」を出す。移した先・追加結果は画面下の固定エリアに出す。
- 「この日の献立：…（残したまま追加します）」は日の見出しの下に1回だけ出す。
- 反映処理・Firestoreへの書き込み内容は変更なし。

## 配布経路

- 実施主体: Claude（アプリ側チャット）。app ownerが方針を承認（「ユーザー目線でよくよく考えて、問題なければそれで進めてください」）。
- 方式: EAS Update（OTA）。`--environment preview`。channel: `default` と `android-internal`。runtime `exposdk:58.0.0`。native変更なし。

## 配信前確認

- `npx tsc --noEmit`: 終了コード0。`expo export`（android）: 成功。
- 実機での確認: 配信後にapp ownerが確認する。

## 直前の安定版・rollback

- `default`: `f2c2d162-971f-4ac7-89e5-362f4d6b2e8f`。`android-internal`: `520c2005-7264-41a1-b2cc-546cf039a482`（ともに 20261027-MEALPLANNER-001）。

## 配信後の記録

配信日: 2026-10-27 JST。実施主体: Claude。配信時の working tree は clean、HEAD `0aabbc7` は実remote mainと一致。`--environment preview`、`--non-interactive`、どちらも exit 0。

| channel | update group ID | runtime | platform |
|---|---|---|---|
| default | `9b4bd9d2-b59d-4b7f-a08d-8a19ab6f2ed7` | `exposdk:58.0.0` | android, ios |
| android-internal | `5c2899a3-d037-433a-9c2b-d88e6bae7098` | `exposdk:58.0.0` | android, ios |

- 端末確認: 未実施。日付を変えると料理がその日の見出しへ移ること、「戻す」、画面下の表示を確認する。

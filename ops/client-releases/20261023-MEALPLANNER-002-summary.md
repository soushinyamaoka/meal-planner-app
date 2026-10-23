# Client Release Plan

record_type: client_release
client_release_id: 20261023-MEALPLANNER-002
app: meal-planner-app
status: delivered
source_commit: b1404ed089fe88f696d37221d3e35914b24b75f4
distribution_status: published
release_gate: user_approved
server_change_notice: なし（本releaseはクライアントのみ。サーバー・APIの変更はない）

## 配信対象

表示の不具合修正（`b1404ed`）。app ownerが SDK 58 の Android 端末で、今日のごはんの長い料理名が右端で見切れていることを報告した。スタイルは SDK 58 より前から同じで、長いレシピ名で表に出た既存の問題。

- 料理名（今日のごはん・日付カード・給食タブ）がカード幅を超えず、折り返して全部表示されるようにした（`src/styles/appStyles.ts`）。
- ヘッダーの「献立ノート」を1行に収め（必要なら文字を縮める）、右側の世帯名は幅を最大110に制限して、長ければ省略する（`App.tsx`）。
- URLから取り込んだレシピ名の「｜サイト名 [説明]」を外す（`src/api/index.ts` の `cleanRecipeTitle`。取り込みの共通関数なので RecipeFormFull と RecipeFormInline の両方に効く）。既に保存済みのレシピ名は変更しない。
- 文書の SDK 表記を 58 に更新した（CLAUDE.md, README.md, docs/RELEASE_AND_DEPLOY.md）。

## 配布経路

- 実施主体: Claude（アプリ側チャット）。app ownerが「おかしなところはまとめて直しちゃってください」と指示し、直前の配信可否の確認への回答とした。
- 方式: EAS Update（OTA）。`--environment preview`。channel: `default` と `android-internal`。runtime `exposdk:58.0.0`。native変更なし。

## 配信前確認

- `npm run typecheck`: 終了コード0。`expo export`（android）: 成功。
- `cleanRecipeTitle` の確認: 「…塩バター煮｜だいどこログ [生活クラブ…]」→「…塩バター煮」、「豚汁」→ そのまま、区切りの前が空なら元のまま。
- 実機での確認: 未実施。

## 直前の安定版・rollback

- `default`: `e72c78f1-ea39-4bcb-b813-41e89c0d616f`。`android-internal`: `9b544842-e81a-4e10-9bc2-817054c76eba`（ともに 20261023-MEALPLANNER-001）。

## 配信後の記録

配信日: 2026-10-23 JST。実施主体: Claude。配信時の working tree は clean、HEAD `a94bfb6` は実remote mainと一致。`--environment preview`、`--non-interactive`、どちらも exit 0。

| channel | update group ID | runtime | platform |
|---|---|---|---|
| default | `945ffff1-8e7e-4b85-a60d-d45e2778608d` | `exposdk:58.0.0` | android, ios |
| android-internal | `351d15de-8789-47c4-b95e-9867fb1835eb` | `exposdk:58.0.0` | android, ios |

- 端末確認: 未実施。確認する項目: ①今日のごはんの長い料理名が折り返して全部見えること、②ヘッダーの「献立ノート」が1行で表示されること、③URLからレシピ名を取り込むとサイト名が付かないこと。

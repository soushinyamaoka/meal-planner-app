# Client Release Plan

record_type: client_release
client_release_id: 20261028-MEALPLANNER-001
app: meal-planner-app
status: delivered
source_commit: 355992981d1d84e50a61b2470b8835989c0015f4
distribution_status: published
release_gate: user_approved
server_change_notice: なし（本releaseはクライアントのみ。サーバー・APIの変更はない）

## 配信対象

レシピを開いているあいだは画面を消さない（`3559929`）。

- app ownerの要望: 料理しながらレシピを見ていると、途中で画面が消えて困る。
- `RecipeDetailContent`（献立タブ・レシピタブのレシピ詳細で共通）で `useKeepAwake` を使う。閉じると元の自動消灯に戻る。切り替えボタンは付けない（app owner承認済みの仕様）。
- レシピの編集画面、AI提案画面の「作り方を見る」は対象外。
- `expo-keep-awake` を直接の依存にした。expo の依存として同じ 58.0.3 がすでに組み込まれており（Android の autolinking で確認）、native 変更はない。

## 配布経路

- 実施主体: Claude（アプリ側チャット）。app ownerが仕様を承認（「進めてください」）。
- 方式: EAS Update（OTA）。`--environment preview`。channel: `default` と `android-internal`。runtime `exposdk:58.0.0`。

## 配信前確認

- `npx tsc --noEmit`: 終了コード0。`expo export`（android）: 成功。
- 実機での確認: 配信後にapp ownerが確認する。

## 直前の安定版・rollback

- `default`: `9b4bd9d2-b59d-4b7f-a08d-8a19ab6f2ed7`。`android-internal`: `5c2899a3-d037-433a-9c2b-d88e6bae7098`（ともに 20261027-MEALPLANNER-002）。

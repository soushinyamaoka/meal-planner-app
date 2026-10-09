# Client Release Plan

record_type: client_release
client_release_id: 20261010-MEALPLANNER-001
app: meal-planner-app
status: planned
source_commit: d8722d5a262e83c779147ca7944aefeaf52d7f38
distribution_status: not_started
release_gate: user_approved
server_change_notice: なし（本releaseはクライアントのみ。サーバー・APIの変更はない）

## 配信対象

前回配信（`20261007-MEALPLANNER-002`、source `aec5523`）以降の、次の3つの変更。

1. **献立に使ったレシピを削除しない（`d8722d5`）**: 将来の分析に使うため、献立に使ったレシピをFirestoreに残す。
   - 献立専用レシピ（`showInList: false`）の自動削除（使った日から7日経過、またはどの献立からも参照されないと削除）を廃止する。アプリは7日前〜14日後の献立しか読み込まないため、従来は、過去の献立から参照されているレシピも削除されていた。
   - レシピ一覧での削除は、全日付の献立をサーバーから読み（`getDocsFromServer`）、使ったことがあれば一覧から外すだけにしてデータを残す。使ったことがなく、URLもないレシピだけを物理削除する。確認できない場合（オフライン等）は残す。
   - 使用判定: 献立の料理の `recipeId` が一致する、または `recipeId` が無く料理名が一致する。
   - `setRecipes` 経由では物理削除しない（外されたレシピは `showInList: false` で残す）。
2. **AIに献立を相談: 候補から選んで追加（`d46fe34`）**: 回答の料理を個別に選び、選んだ料理だけを提案日の献立の末尾に追加する。相談文で主菜・副菜・汁物の3品を指定する。
3. **AIに献立を相談: 料理名だけの料理の扱い（`957887b`）**: 材料も作り方も無い料理（味噌汁・牛丼など）は「料理名だけ（レシピなし）」と表示し、読み取り直後から選択済みにする。プレビュー上部に全日分の「全部選ぶ／全部外す」を追加する。

## 配布経路

- 実施主体: Claude（アプリ側チャット）。app ownerが2026-10-10に前倒し配信（3変更まとめて）を明示承認した（「修正し、前倒し配信にします」「まとめて配信で良いです」）。
- 方式: EAS Update（OTA）。`--environment preview`。channel: `android-internal` と `default` の両方。
- runtime: `exposdk:57.0.0`（前回配信と同一）。platform: android, ios。
- native変更: なし。`package.json`・`package-lock.json`・`app.config.js`・`eas.json` は前回配信の記録コミット（`3f43012`）から差分なし。新しい依存の追加もない（`getDocsFromServer` は既存の `firebase/firestore`）。
- 変更ファイル（ops・docs以外）: `App.tsx`, `src/components/AiMealPrompt.tsx`, `src/hooks/useFirestore.tsx`, `src/tabs/RecipesTab.tsx`, `src/utils/aiMealApply.ts`（新規）, `src/utils/aiMealDraft.ts`, `src/utils/aiMealPlan.ts`, `src/utils/recipeUsage.ts`（新規）。
- アップロード対象: `.env` はgit除外済み。`.easignore` は無し。秘密値は含まれない。

## Serverとの前後関係

サーバー・APIの変更を伴わない。Firestoreのデータ構造も変えない（既存の `showInList` を使う）。

## 配信前確認

- `npm run typecheck`: 終了コード0。`expo export --platform android` のバンドルも成功。作業ツリーclean。
- 純粋関数の一時検証: 使用判定5件（主キー一致・recipeIdなしの名前一致・他レシピを指す同名料理は不一致・未使用・献立なし）、AI相談の選択・追加の組み立て（計27件）、すべて期待どおり。
- 実機での確認: **未実施**。配信後に確認する。

## 直前の安定版・rollback

- 直前の配信（`20261007-MEALPLANNER-002`）: android-internal `628364d6-92f3-4075-a291-1c514f74cb62` / default `c79f07b9-afe2-4e98-8a0e-12effa3e078b`。
- rollback: 上記を同じchannelへ再配信する（`eas update:republish`）。次回起動以降に切り替わる。
- **rollback時の注意**: 戻すと献立専用レシピの自動削除が再び動き、本releaseで残したレシピ（献立から外れたもの・7日より前の献立だけが使うもの）が削除される。データを残す目的に反するため、rollbackはAI相談の不具合など必要な場合に限る。

## 配信後の記録

（配信後に追記する）

## 承認と状態

- app owner: 2026-10-10に前倒し配信を明示承認。
- VPS management review: クライアントのみの変更で、サーバー変更通知は不要。
- VPS production approval: 該当する操作なし。
- client distribution: not_started。

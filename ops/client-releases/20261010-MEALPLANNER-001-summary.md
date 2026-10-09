# Client Release Plan

record_type: client_release
client_release_id: 20261010-MEALPLANNER-001
app: meal-planner-app
status: delivered
source_commit: d8722d5a262e83c779147ca7944aefeaf52d7f38
distribution_status: published
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

配信日: 2026-10-10 JST。実施主体: Claude（app ownerの明示承認後）。配信時のworking treeはclean、`git` HEAD `1498f82` は実remote mainと一致し、`d8722d5..1498f82` のops以外の差分は無し。

| channel | update group ID | runtime | platform |
|---|---|---|---|
| android-internal | `e582d83c-fdca-4597-aa9a-2af35e7ee091` | `exposdk:57.0.0` | android, ios |
| default | `9f06716e-8905-4d54-bfb9-869502ec1010` | `exposdk:57.0.0` | android, ios |

- Androidのupdate ID: android-internal `01a122a6-4be3-7e6f-bc5d-1933709b2749` / default `01a122a6-ff69-7838-a718-708e167e350a`。iOSのupdate ID: android-internal `01a122a6-4be3-7823-8665-7179a6c44fe4` / default `01a122a6-ff69-7f9e-925d-9b401ab214d0`。
- EAS environment: `preview`。`--non-interactive`。どちらもexit 0。
- **端末確認: 未実施**。確認する項目: ①アプリを完全に閉じて開き直し、新しいbundleが適用されること（家族の端末すべて。更新されるまで旧版の自動削除が動く）、②レシピ一覧で、献立に使ったレシピを削除しようとすると「献立で使ったことがあるため、一覧から外します」と出て、外した後も過去の献立から開けること、③使っていないレシピは「本当に削除しますか？」と出て削除できること、④AI相談で、料理名だけの料理が最初から選択され、「全部選ぶ／全部外す」が効くこと、⑤選んだ料理だけが提案日の献立の末尾に追加されること。
- Expo Go（iOS）は `default`、Android実機は `android-internal` を読む。新しいbundleに切り替わるのは次回起動以降。
- 結果: 「アプリ側の配信は完了／端末確認は未実施」。

## 承認と状態

- app owner: 2026-10-10に前倒し配信を明示承認。
- VPS management review: クライアントのみの変更で、サーバー変更通知は不要。
- VPS production approval: 該当する操作なし。
- client distribution: published（2026-10-10、EAS Update両channel。端末確認は未実施）。

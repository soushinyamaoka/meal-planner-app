# Client Release Plan

record_type: client_release
client_release_id: 20261005-MEALPLANNER-002
app: meal-planner-app
status: ready
source_commit: 9f71ca2fc8a37718eb458089959156c9ed8997d6
distribution_status: approved
release_gate: user_approved
server_change_notice: なし（本releaseはクライアントのみ。サーバー・APIの変更はない）

## 配信対象

COOPタブの「AIに献立を相談」で、COOPの商品を選びなおしたり確認したりするために一覧へ戻っても、入力内容が消えないようにする。AI Progress `c7b65148`、Codex task `20261005-015`。

- **保持する範囲**: 使う食材のチップ、ほかの食材、開始日、日数、人数、補足、生成した相談文、貼り付けた回答、読み取り結果（プレビュー・読み取れなかった行）、反映後のメッセージ、プレビューの展開状態。一覧へ戻って再び開いたとき、他のタブへ移動して戻ったときも、そのまま続けられる。アプリを終了すると消える（端末には保存しない）。
- **COOP一覧の選択の反映**: 相談画面を開くたびに、COOP一覧で選択中の商品のうち、まだ食材チップに無く、チップの「×」で外したことのない商品を、チップの末尾に追加する。「×」で外した商品は、一覧で選択中でも戻さない。一覧で選択を外しても、チップから自動では消さない。
- **「献立に反映」の後**: 貼り付けた回答・プレビュー・読み取れなかった行・展開状態だけを消す。食材・期間・人数・補足・相談文は残る。
- **「入力をリセット」ボタン**（新規。確認つき）: すべてを初期状態に戻す。チップはその時点のCOOP一覧の選択で作り直し、「×」で外した記録も消す。
- 既存の「クリア」ボタン（回答・プレビューのクリア）は従来どおり。

## 配布経路

- 実施主体: Claude（アプリ側チャット）。app ownerが2026-10-05に配信を明示承認した（「順に進めてください」）。
- 方式: EAS Update（OTA）。`--environment preview`。channel: `android-internal` と `default` の両方。
- runtime: `exposdk:57.0.0`（前回配信と同一）。platform: android, ios。
- native変更: なし。`package.json`・`package-lock.json`・`app.config.js`・`eas.json` は前回配信の最終コード（`197de82`）から差分なし。新しいnative libraryは追加していない。
- 変更ファイル（前回配信のコードからのops・docs以外）: `src/components/AiMealPrompt.tsx`、`src/tabs/CoopTab.tsx`、`src/utils/aiMealDraft.ts`（新規）。
- アップロード対象: `.env` はgit除外済み。`.easignore` は無し。秘密値は含まれない。

## Serverとの前後関係

サーバー・APIの変更を伴わない。保存形式の変更もない（状態は端末のメモリにだけ持ち、保存しない）。

## 配信前確認

- `npm run typecheck`: 終了コード0。`expo export --platform android` のバンドルも成功。作業ツリーclean。
- チップへの追加の純粋関数（`mergeSelectedIntoChips`、`resetAiMealDraft`）は、実行して7ケースを確認済み: 新しい選択だけを末尾に追加／外した商品は戻さない／一覧で外してもチップは消さない／重複しない／リセットで初期値（日数3・人数2・開始日0・他は空、チップは現在の選択）／元の配列を壊さない／外した記録のある商品を再び選んでも戻らない。
- コードレビュー: 状態をCoopTab側で保持し、`AiMealPrompt` の破棄で消えないこと。「献立に反映」の後に消すのが回答・プレビュー等だけであること。リセットに確認があること。回答の読み取り・相談文の生成・献立とレシピの保存の動作が変わっていないこと。差分は関係する箇所だけで、既存コードの書式の整形は無い。
- 実機での画面確認: **未実施**（配信後に確認する）。

## 直前の安定版・rollback

- 直前の安定版（`20261005-MEALPLANNER-001`、2026-10-05配信）: android-internal `e422917f-3f18-4e54-8813-62281a793e45` / default `e32d0d62-1e7c-405a-b0ed-beeb6e951258`。
- rollback: 上記を同じchannelへ再配信する（`eas update:republish`）。次回起動以降に切り替わる。保存データは変わらないため、データへの影響はない（旧版は、一覧へ戻ると相談画面の入力が消える従来の動作に戻る）。

## 配信後の記録

（配信後に、update group ID・配信時刻・端末確認結果を追記する）

## 承認と状態

- app owner: 2026-10-05に配信を明示承認。
- VPS management review: クライアントのみの変更で、サーバー変更通知は不要。
- VPS production approval: 該当する操作なし。
- client distribution: approved（配信前）。

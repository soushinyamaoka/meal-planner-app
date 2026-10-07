# Client Release Plan

record_type: client_release
client_release_id: 20261005-MEALPLANNER-002
app: meal-planner-app
status: delivered
source_commit: 9f71ca2fc8a37718eb458089959156c9ed8997d6
distribution_status: published
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

配信日: 2026-10-07 JST（配信計画の作成・承認は2026-10-05。直後のpushがGitHubの認証の問題で拒否されたため、認証を直した後に配信した）。実施主体: Claude（app ownerの明示承認後）。配信時のworking treeはclean、`git` HEAD `c59f4cb` は実remote mainと一致し、`9f71ca2..c59f4cb` のops・docs以外の差分は無し。

| channel | update group ID | runtime | platform |
|---|---|---|---|
| android-internal | `e6903569-09ac-4e5e-a09a-d9aada4fb12a` | `exposdk:57.0.0` | android, ios |
| default | `267f5e92-ad5c-4b4b-924b-73378be19d57` | `exposdk:57.0.0` | android, ios |

- Androidのupdate ID: android-internal `01a113ce-cc4a-7b6e-9581-b1c40ef8372e` / default `01a113cf-7723-728a-90fb-5a149d8ee7c1`。iOSのupdate ID: android-internal `01a113ce-cc4a-7862-af46-03e00485673c` / default `01a113cf-7723-7acf-ad23-26860958bf63`。
- EAS environment: `preview`。`--non-interactive`。どちらもexit 0。
- **端末確認: 未実施**。確認する項目: ①アプリを完全に閉じて開き直し、新しいbundleが適用されること、②COOP一覧で商品を選び、「AIに献立を相談」を開くと、選んだ商品が食材チップに入っていること、③相談画面で、日数・人数・補足・ほかの食材などを入力し、相談文を作成した後、「← 戻る」で一覧へ戻り、再び開いても、すべて残っていること、④一覧で商品を選びなおして再び開くと、新しく選んだ商品だけがチップの末尾に追加されること、⑤チップの「×」で外した商品が、一覧で選択中でも戻らないこと、⑥他のタブ（献立・レシピ等）へ移動してCOOPタブへ戻っても、入力が残っていること、⑦ChatGPTなどの回答を貼り付けて読み取り、「献立に反映」した後、回答とプレビューだけが消え、食材・期間・人数・補足・相談文は残ること（**反映は指定日の献立を置き換えるので、使っていない先の日付で確認する**）、⑧「入力をリセット」を押すと確認が出て、「リセットする」で、日数3・人数2・開始日「今日」に戻り、チップが現在の一覧の選択で作り直されること。
- Expo Go（iOS）は `default`、Android実機は `android-internal` を読む。新しいbundleに切り替わるのは次回起動以降。
- 結果: 「アプリ側の配信は完了／端末確認は未実施」。

## 承認と状態

- app owner: 2026-10-05に配信を明示承認。
- VPS management review: クライアントのみの変更で、サーバー変更通知は不要。
- VPS production approval: 該当する操作なし。
- client distribution: published（2026-10-07、EAS Update両channel。端末確認は未実施）。

# Client Release Plan

record_type: client_release
client_release_id: 20261004-MEALPLANNER-002
app: meal-planner-app
status: delivered
source_commit: e1259d475e7e2207b26a7cec5c1f249362da5433
distribution_status: published
release_gate: user_approved
server_change_notice: なし（本releaseはクライアントのみ。サーバー・APIの変更はない）

## 配信対象

直前の配信（`20261004-MEALPLANNER-001`、source `52b7443`）の「AIに献立を相談」を、AIが料理ごとの材料と作り方まで出力し、レシピとして取り込む仕様へ変更する。AI Progress `b818bd8c`、Codex task `20261004-011`。

- 相談文: 回答形式を「日付の行、■料理名、材料:、作り方:」に変更。材料は指定した人数分の分量で書かせる。
- 回答の読み取り: 料理ごとの材料・作り方を読み取る。旧形式（`10/5: 料理 / 料理`）も料理名だけの料理として読める。
- プレビュー: 料理ごとに「材料N品・手順N」を表示し、展開して中身を確認できる。登録済みレシピと同名なら「登録済みのレシピを使います」、材料・作り方が欠けていれば「⚠ 作り方がありません（料理名だけ反映します）」、料理のない日付は「この日は反映しません」と表示する。
- 反映: 材料と作り方がそろった料理は、**献立専用レシピ**（レシピ一覧には出さない）として保存し、献立から開ける。同名の登録済みレシピがあればそれを優先する。反映先の日の献立は置き換える（プレビューで警告）。レシピと献立は1回の書き込み（batch）でまとめて保存する。
- 保存した献立専用レシピは、既存の「📖 レシピ一覧に追加」でレシピ一覧へ移せる。

## 配布経路

- 実施主体: Claude（アプリ側チャット）。app ownerが2026-10-04に配信を明示承認した（「プッシュして、配信に進んでください」）。
- 方式: EAS Update（OTA）。`--environment preview`。
- channel: `android-internal` と `default` の両方。
- runtime: `exposdk:57.0.0`（前回配信と同一）。platform: android, ios。
- native変更: なし。`package.json`・`package-lock.json`・`app.config.js`・`eas.json` は前回配信source `52b7443` から差分なし。新しいnative libraryは追加していない。OTAで配信できる。
- 変更ファイル（前回配信sourceからのops以外）: `App.tsx`、`src/components/AiMealPrompt.tsx`、`src/hooks/useFirestore.tsx`、`src/tabs/CoopTab.tsx`、`src/utils/aiMealPlan.ts`。
- アップロード対象: `.env` はgit除外済み。`.easignore` は無し。秘密値は含まれない。

## Serverとの前後関係

- サーバー・APIの変更を伴わない。外部AIへも接続しない（相談文の生成と回答の読み取りは端末内で完結する）。
- 保存先はFirestoreのレシピと献立で、既存の経路を使う。新しい保存形式の項目は追加していない（レシピは既存の `showInList: false`、材料、作り方）。
- 旧端末版（本release未適用）は、この機能の新しい回答形式を読めない。旧版の相談文で得た回答（`日付: 料理 / 料理`）は、本releaseでも読める。

## 配信前確認

- `npm run typecheck`: 終了コード0（2026-10-04）。作業ツリーclean。
- 回答の読み取りは、一時スクリプトで14通りを確認済み（回答例の2日3料理、句点付きの手順、記号なしの手順、締めの文章、日付が降順、分量から始まる材料、`材料（2人分）:`・`①`・`1)` 等の揺れ、途中で切れた回答、料理のない日付、読めない日付の後の料理、旧形式、年またぎ）。
- 指摘して直した不具合: ①「。」で終わる手順がすべて捨てられレシピが作られない、②日付が降順だと料理が別の日に付く、③料理のない日付で既存の献立が空で置き換わる。Codexの実装（`297b44a`）に対する修正が `e1259d4`。
- レシピと献立を同一batchで保存すること（献立専用で参照されないレシピを自動削除する既存処理と競合しないこと）は、コードで確認済み。
- 実機での画面確認・実際のAI回答の貼り付け: **未実施**（配信後に確認する）。

## 直前の安定版・rollback

- 直前の安定版（`20261004-MEALPLANNER-001`、2026-10-04配信）: android-internal `bbc550d0-dd81-4e30-836b-a87112a64f87` / default `8f05dc47-761d-419a-8015-84d4a5494282`。
- rollback: 上記を同じchannelへ再配信する（`eas update:republish`）。次回起動以降に切り替わる。
- 注意: rollback後も、本releaseで保存された献立専用レシピ・置き換えた献立は、Firestoreにデータとして残る（旧版は献立専用レシピを料理名から開けるため、表示はできる）。

## 配信後の記録

配信日: 2026-10-04 JST。実施主体: Claude（app ownerの明示承認後）。配信時のworking treeはclean、`git` HEAD `ef64a54` は実remote mainと一致し、`e1259d4..ef64a54` のops以外の差分は無し。

| channel | update group ID | runtime | platform |
|---|---|---|---|
| android-internal | `832c2779-d83d-4b80-ac6c-b9dd90c2597b` | `exposdk:57.0.0` | android, ios |
| default | `8844fb1d-4ff8-4dac-9c31-4426f778d800` | `exposdk:57.0.0` | android, ios |

- Androidのupdate ID: android-internal `01a10621-897b-7747-ad21-f1e53ef9fdec` / default `01a10622-3581-762c-8041-16d6075d68d4`。iOSのupdate ID: android-internal `01a10621-897b-7b36-b988-ff2d6f9b638b` / default `01a10622-3581-7daa-9353-8889fa2a7a65`。
- EAS environment: `preview`。`--non-interactive`。どちらもexit 0。
- **端末確認: 未実施**。確認する項目: ①アプリを再起動して新しいbundleが適用されること、②COOPタブ「AIに献立を相談」で相談文を作成すると、回答形式に「■料理名・材料:・作り方:」が含まれ、材料を指定した人数分で書くよう指示があること、③実際にAIの回答を貼り付けて「読み取る」と、日ごとの料理と「材料N品・手順N」が表示され、展開して中身が見えること、④「献立に反映」後、献立タブでその料理を開くと材料と作り方が見えること、⑤レシピタブの一覧には増えないこと（献立専用）、⑥登録済みのレシピと同名の料理が「登録済みのレシピを使います」になること、⑦反映先の日に既存の献立がある場合の警告表示。**実データの献立が置き換わるため、確認には、使っていない先の日付を選ぶ。**
- Expo Go（iOS）は `default`、Android実機は `android-internal` を読む。新しいbundleに切り替わるのは次回起動以降。
- 結果: 「アプリ側の配信は完了／端末確認は未実施」。

## 承認と状態

- app owner: 2026-10-04に配信を明示承認。
- VPS management review: クライアントのみの変更で、サーバー変更通知は不要。
- VPS production approval: 該当する操作なし。
- client distribution: published（2026-10-04、EAS Update両channel。端末確認は未実施）。

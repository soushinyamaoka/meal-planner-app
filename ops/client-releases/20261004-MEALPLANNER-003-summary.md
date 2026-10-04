# Client Release Plan

record_type: client_release
client_release_id: 20261004-MEALPLANNER-003
app: meal-planner-app
status: delivered
source_commit: 000cf1a4a9d71769b507983da33c4d2a43d268d6
distribution_status: published
release_gate: user_approved
server_change_notice: なし（本releaseはクライアントのみ。サーバー・APIの変更はない）

## 配信対象

直前の配信（`20261004-MEALPLANNER-002`、source `e1259d4`）の「AIに献立を相談」について、実機で見つかった2つの不具合を直す。

- **回答が読み取れない問題**: チャット画面からコピーした回答は改行が崩れ、「10/4 ■ 料理 材料:」のように日付と料理が同じ行にある、「青首大根 120g 作り方:」のように行末に見出しが付く、という形になる。直前の配信版はこの形を読めず、材料・作り方がすべて空（または全文が「読み取れなかった行」）になった。これらを別の行へ切り分けてから読み取るように修正した。
- **貼り付け欄とボタンの操作性**: 長い回答を貼ると貼り付け欄が画面いっぱいに伸び、「読み取る」ボタンが押しづらかった。貼り付け欄に最大の高さを付け（長文は欄の中でスクロール）、「読み取る」を欄の直下に置き、「クリア」を追加した。読み取り時にキーボードを閉じてプレビューの位置まで自動で画面を送る。読み取れなかった行は8行までに省略し、件数を表示する。

## 配布経路

- 実施主体: Claude（アプリ側チャット）。app ownerが2026-10-04に配信を明示承認した（「配信してください」）。
- 方式: EAS Update（OTA）。`--environment preview`。channel: `android-internal` と `default` の両方。
- runtime: `exposdk:57.0.0`（前回配信と同一）。platform: android, ios。
- native変更: なし。`package.json`・`package-lock.json`・`app.config.js`・`eas.json` は前回配信source `e1259d4` から差分なし。新しいnative libraryは追加していない（`Keyboard`は`react-native`標準）。
- 変更ファイル（前回配信sourceからのops以外）: `src/components/AiMealPrompt.tsx`、`src/utils/aiMealPlan.ts`。
- アップロード対象: `.env` はgit除外済み。`.easignore` は無し。秘密値は含まれない。

## Serverとの前後関係

サーバー・APIの変更を伴わない。外部AIへも接続しない（相談文の生成と回答の読み取りは端末内で完結する）。保存形式の変更もない。

## 配信前確認

- `npm run typecheck`: 終了コード0。`expo export --platform android` のバンドルも成功。作業ツリーclean。
- 回答の読み取りは、**ユーザーが実機で貼り付けた実際のチャット出力の全文**で確認した（開始日が10/4のとき、3日・11料理、すべての料理に材料と手順があり、読めない行は0）。あわせて、既存の確認ケース（句点付きの手順、記号なしの手順、見出しの揺れ、途中で切れた回答、旧形式、年またぎ、材料の分量を日付と誤認しない等）の回帰がないことを確認した。
- 実機での画面確認（貼り付け欄の高さ、「読み取る」の位置、プレビューへの自動スクロール、「クリア」）: **未実施**（配信後に確認する）。

## 直前の安定版・rollback

- 直前の安定版（`20261004-MEALPLANNER-002`、2026-10-04配信）: android-internal `832c2779-d83d-4b80-ac6c-b9dd90c2597b` / default `8844fb1d-4ff8-4dac-9c31-4426f778d800`。ただし、この版には上記の不具合（実際のチャット出力を読めない）がある。
- rollback: 上記を同じchannelへ再配信する（`eas update:republish`）。1つ前の `20261004-MEALPLANNER-001`（android-internal `bbc550d0-dd81-4e30-836b-a87112a64f87` / default `8f05dc47-761d-419a-8015-84d4a5494282`）へ戻すこともできる（料理名だけを取り込む旧仕様）。
- 注意: rollbackしても、Firestoreへ保存済みのレシピ・献立はデータとして残る。

## 配信後の記録

配信日: 2026-10-04 JST。実施主体: Claude（app ownerの明示承認後）。配信時のworking treeはclean、`git` HEAD `8b772fb` は実remote mainと一致し、`000cf1a..8b772fb` のops以外の差分は無し。

| channel | update group ID | runtime | platform |
|---|---|---|---|
| android-internal | `8f67c3ea-0f60-478b-88b0-ddff26abe38b` | `exposdk:57.0.0` | android, ios |
| default | `7f1531e7-e412-40b5-9f24-dfa8d85b4d2b` | `exposdk:57.0.0` | android, ios |

- Androidのupdate ID: android-internal `01a10630-e9ba-76ff-8aec-ebf9ac9e5369` / default `01a10631-7a87-7497-9249-9616e3e599fb`。iOSのupdate ID: android-internal `01a10630-e9ba-7b2b-b943-0bdd31e627d9` / default `01a10631-7a87-7a92-8f2f-150b799b6bb6`。
- EAS environment: `preview`。`--non-interactive`。どちらもexit 0。
- **端末確認: 未実施**。確認する項目: ①アプリを完全に閉じて開き直し、新しいbundleが適用されること、②実際のチャット出力（改行が崩れたもの）を貼り付けて「読み取る」と、日ごとの料理と「材料N品・手順N」が表示されること、③長い回答を貼っても貼り付け欄が画面いっぱいにならず、「読み取る」が欄の直下で押せること、④読み取り後、プレビューの位置まで画面が送られること、⑤「クリア」で欄とプレビューが消えること、⑥「献立に反映」後、献立タブで料理を開くと材料と作り方が見えること。**反映は指定日の献立を置き換えるので、使っていない先の日付で確認する。**
- Expo Go（iOS）は `default`、Android実機は `android-internal` を読む。新しいbundleに切り替わるのは次回起動以降。
- 結果: 「アプリ側の配信は完了／端末確認は未実施」。

## 承認と状態

- app owner: 2026-10-04に配信を明示承認。
- VPS management review: クライアントのみの変更で、サーバー変更通知は不要。
- VPS production approval: 該当する操作なし。
- client distribution: published（2026-10-04、EAS Update両channel。端末確認は未実施）。

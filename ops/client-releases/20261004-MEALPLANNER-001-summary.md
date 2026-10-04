# Client Release Plan

record_type: client_release
client_release_id: 20261004-MEALPLANNER-001
app: meal-planner-app
status: delivered
source_commit: 52b74437a97cfdaac96b1fe898d838da091409a3
distribution_status: published
release_gate: user_approved
server_change_notice: ops/server-change-notices/20261004-COOPAPI-006-summary.md（coop-api側。アプリのrepoではなくcoop-apiのrepoにある）

## 配信対象

前回配信（`20260930-MEALPLANNER-001`、source `4facc8a`）以降の次の改修。

- 献立: 削除済みレシピを参照する献立に📖マークが出る不具合の修正。
- お知らせ: 一覧のメンテナンス状態を日本語ラベルで表示。
- レシピ: メモ欄の追加（レシピタブと献立タブの手入力フォームの両方、詳細表示）。
- COOPタブ: 「過去の注文」画面（`GET /api/coop/orders?include_items=true`）、「AIに献立を相談」（プロンプト生成と、AIの回答の貼り付けによる献立への置き換え反映。外部AIは呼ばない）。注文データが無い画面からも使える。
- 内部: `App.tsx` をタブ単位のファイルへ分割（コードの移動のみ、動作は変更しない）。

## 配布経路

- 実施主体: Claude（アプリ側チャット）。app ownerが2026-10-04に配信を明示承認した（「こちらもリリースしましょう」。配信順は「今すぐ」、sourceのpushは「してから配信」を選択）。
- 方式: EAS Update（OTA）。`--environment preview`（本アプリのEAS変数が設定されている環境）。
- channel: `android-internal`（Android実機）と `default`（Android/iOS共通。iOS Expo Goが読む）の両方。
- runtime: `exposdk:57.0.0`（`app.config.js` の `runtimeVersion.policy: sdkVersion`、Expo SDK 57。前回配信と同一）。
- platform: android, ios。
- native変更: なし。`package.json`・`package-lock.json`・`app.config.js`・`eas.json` は前回配信source `4facc8a` から差分なし（`git diff --stat 4facc8a..HEAD` で確認）。新しいnative libraryは追加していない（外部のコピー機能は `react-native` 標準の `Share` を使用）。そのためOTAで配信でき、新binaryは不要。
- source: 配信されるコードの最終commitは `52b7443`。それ以降のcommitは ops/ の文書のみ（配信時に git diff 52b7443..HEAD のops以外の差分が無いことを確認する）。
- アップロード対象: `.env` はgit除外済み（`.gitignore`）。`.easignore` は無し。秘密値は含まれない。

## Serverとの前後関係

- 本releaseは、サーバー反映（coop-api 変更通知 `20261004-COOPAPI-006`）より先でも動作する。`/api/coop/orders` が旧版で `items` を返さない場合、「過去の注文」は日付と件数だけを表示し「商品一覧はサーバー更新後に表示されます」と出す。注文が0件の応答（404）は「注文履歴はまだありません」と表示する。
- サーバー反映後は、同じ端末のまま（再配信なしで）商品一覧が表示される。
- 通知006は2026-10-04に技術受理済み。production反映はVPS管理側が別承認で実施する（本releaseの時点では未実施・未確認）。VPS側が配信の前提条件（gate）を指定しているかは台帳で確認できなかったが、上記のとおりクライアントは旧APIで動作する。
- 旧端末版（本release未適用）は `/api/coop/orders` を呼ばないため、サーバー反映の影響を受けない。

## 配信前確認

- `npm run typecheck`: 終了コード0（2026-10-04）。
- 直前の配信済みsource `4facc8a` からの全差分は、上記の改修のコミット（`ed5c4ee`、`37f2cff`、`52b7443`）と、ops文書のみ。
- 解析処理（AIの回答の読み取り）は、一時スクリプトで曜日付き・太字・全角・年またぎなど15パターンを確認済み。
- 実機での画面確認（過去の注文、AIに献立を相談、メモ欄、📖マーク、お知らせ一覧）: **未実施**（配信後に確認する）。

## 直前の安定版・rollback

- 直前の安定版（前回配信、2026-10-01）: android-internal `f6bfeae4-7a5f-42ff-a5b5-73870a5878a4` / default `15c35add-71d5-43b5-aa54-b74b029d5d5b`。
- rollback: 上記の直前の安定版updateを、同じchannelへ再配信する（`eas update:republish`）。端末が取得済みのbundleを切り替える時期（次回起動以降）とcacheを確認する。Firestoreへ既に保存されたレシピのメモ欄（`memo`）・置き換え反映済みの献立は、client rollbackだけでは戻らない。
- rollback不能・注意: 「AIに献立を相談」で置き換えた献立と、保存したメモは、旧版でもデータとして残る（旧版はメモ欄を表示しないだけ）。

## 配信後の記録

配信日: 2026-10-04 JST。実施主体: Claude（app ownerの明示承認後）。配信時のworking treeはclean、`git` HEAD `c2d0670` は実remote mainと一致し、`52b7443..c2d0670` のops以外の差分は無し。

| channel | update group ID | runtime | platform |
|---|---|---|---|
| android-internal | `bbc550d0-dd81-4e30-836b-a87112a64f87` | `exposdk:57.0.0` | android, ios |
| default | `8f05dc47-761d-419a-8015-84d4a5494282` | `exposdk:57.0.0` | android, ios |

- Androidのupdate ID: android-internal `01a10553-d8f4-7c6f-b779-576b92b4fd66` / default `01a10554-993f-77c3-b62f-bebe14e813a3`。iOSのupdate ID: android-internal `01a10553-d8f4-70d7-8026-5fe30fb4f72b` / default `01a10554-993f-7f14-89a9-2e9b1c6c4d99`。
- EAS environment: `preview`。`--non-interactive`。バンドルはandroid・iOSとも新規asset無し（既存asset再利用）。
- 配信コマンドの結果: どちらもexit 0。前回配信（2026-10-01）から `package.json`・`app.config.js`・`eas.json` の差分は無く、fingerprintの計算は成功した。
- **端末確認: 未実施**。確認する項目: ①アプリを再起動して新しいbundleが適用されること、②COOPタブの「過去の注文」（サーバー反映前は日付と件数のみ、反映後は商品一覧）、③「AIに献立を相談」でプロンプト生成と、AIの回答の読み取り・プレビュー・置き換え反映（実データの献立が置き換わるため、確認用の日と料理を決めて行う）、④レシピのメモ欄（レシピタブと献立タブの両方）、⑤削除済みレシピを参照する献立に📖が出ないこと、⑥お知らせ一覧のメンテナンス状態が日本語であること。
- Expo Go（iOS）は `default` を読む。Android実機は `android-internal` を読む。端末が新しいbundleを取得して切り替わるのは、次回起動以降。
- 結果: 「アプリ側の配信は完了／端末確認は未実施」。サーバー側（通知006）のproduction反映は別途VPS管理側で実施中の想定で、こちらからは確認できていない。

## 承認と状態

- app owner: 2026-10-04に配信を明示承認。
- VPS management review: 本releaseはclient releaseであり、VPSのproduction変更ではない。サーバー側は通知 `20261004-COOPAPI-006` として別管理（技術受理済み・production反映は別承認）。
- VPS production approval: 該当する操作なし（本releaseでサーバーへ変更を加えない）。
- client distribution: published（2026-10-04、EAS Update両channel。端末確認は未実施）。

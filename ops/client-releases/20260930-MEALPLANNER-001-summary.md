# Client Release Plan

record_type: client_release
client_release_id: 20260930-MEALPLANNER-001
app: meal-planner-app
status: draft
source_commit: 4facc8a98f5be987d168797831416e53ebdf6d7b
distribution_status: not_started
release_gate: on_hold
server_change_notice: ops/server-change-notices/20260930-MEALPLANNER-001-summary.md

## 配信対象

タスク `20260930-002`〜`006` のレシピ、Firestore保存失敗表示、COOP取得・献立・商品分類の改修。文書と `typecheck` scriptの整備、およびタスク008のJSX構文修正も同じsourceへ含める。

## 配布経路と未確認事項

- 実施主体: Claude（アプリ側チャット）。ユーザーが今回もClaudeへ端末配信を依頼する方針。VPS管理側はserver連携のreviewのみ。
- repository設定: `eas.json` の `development`・`preview`・`production` は `default` channel、`android-internal` は同名channel。どのprofile/branchを使うかは未確定。
- runtime: `app.config.js` は `runtimeVersion.policy: sdkVersion`、Expo SDK 57。既存配布binaryのruntime、native fingerprint、platform、update groupは未確認。
- `package-lock.json`、`app.config.js`、`eas.json`、依存versionは今回の作業ツリーで変更なし。ただし端末配信済みsourceからの全差分はbaseline未確定のため未確認。
- `.env` の実ファイルはGit除外済みで内容未参照。`.easignore` はない。EASへアップロードする実ファイル一覧を配信前に確認し、`.env` や一時ファイルが含まれないことを確認する。

## Serverとの前後関係

VPS管理からCOOP APIの稼働commitを `f4259490f78f5b358a6eec938e86281148866394` と訂正する指示を受けた。同commitのソースに `GET /api/coop/ingredients`、`POST /api/coop/fetch`、`PUT /api/coop/classify` が存在する。VPSへの直接接続確認は未実施。分類PUTの並行更新対策とCOOPバックアップの復旧・隔離復元はVPS管理側の別作業であり、両方の完了まで本releaseは保留する。旧端末版は起動時POSTを継続し得る。

## 配信前条件

1. タスク008の構文修正後、`npm run typecheck` は終了コード0で成功。配信直前に固定sourceとの差異を確認する。
2. 配信済みsource、対象branch/channel、runtime、platform、直前安定版、native fingerprintと互換性を確認する。
3. source `4facc8a98f5be987d168797831416e53ebdf6d7b` とnotice初版・セルフチェック追記は `main` へpush済み。VPS管理で通知が技術受理されたとの報告をユーザーから受領。モバイルbaseline未登録は手動審査で扱う。技術受理は端末配信の許可ではない。
4. VPS管理側から、分類PUTの並行更新対策とCOOPバックアップの復旧・隔離復元の両方について完了報告を受ける。完了までEAS Update・新binary配布を行わない。
5. 対象releaseと配布先を示し、app ownerの端末配信に対する明示承認を別途得る。

## 配信・確認・rollback

- 配信: 保留・未実施。EAS Updateか新binaryかはVPS管理側の上記作業完了とnative互換性確認後に決める。
- 端末確認: COOP一覧GET、手動POST、分類PUT後GET、献立の確認表示、レシピ保持、保存失敗表示を対象端末で確認する。実データに影響する操作の確認方法は別途決める。
- rollback: 直前の安定版updateを対象branchへ再配信する方針。端末が取得済みbundleを切り替える時期、再起動、cache、runtime互換性を確認する。分類JSONやFirestoreへ既に書かれた値はclient rollbackだけでは戻らない。
- 配信後の記録: update group/build ID、配信時刻、対象platform、端末確認結果を本記録に追記する。

## 承認と状態

- app owner: Claudeへ端末配信を依頼する方針。対象releaseを特定した配信の個別承認は未取得。
- VPS management review: notice `20260930-MEALPLANNER-001` は技術受理との報告をユーザーから受領。モバイルbaseline未登録は手動審査。分類PUT対策とCOOPバックアップ復旧・隔離復元の完了待ち。
- VPS production approval: 該当する操作なし。
- client distribution: not_started。

# Client Release Plan

record_type: client_release
client_release_id: 20260930-MEALPLANNER-001
app: meal-planner-app
status: draft
source_commit: 4facc8a98f5be987d168797831416e53ebdf6d7b
distribution_status: not_started
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

COOP APIのproduction baseline `f26c2119ac5b3677916e5e4afe02242565a6da4f` のsourceに `GET /api/coop/ingredients`、`POST /api/coop/fetch`、`PUT /api/coop/classify` が存在する。新規server codeの配布は予定しない。実VPSの稼働状態と分類PUTの同時実行安全性はVPS管理reviewで確認する。旧端末版は起動時POSTを継続し得る。

## 配信前条件

1. タスク008の構文修正後、`npm run typecheck` は終了コード0で成功。配信直前に固定sourceとの差異を確認する。
2. 配信済みsource、対象branch/channel、runtime、platform、直前安定版、native fingerprintと互換性を確認する。
3. sourceは `4facc8a98f5be987d168797831416e53ebdf6d7b` に固定済み。noticeをcommit/pushし、実remoteと一致させる。VPS管理レビューで既存API・backup・rollbackの論点を確認する。
4. 対象releaseと配布先を示し、app ownerの端末配信に対する明示承認を別途得る。

## 配信・確認・rollback

- 配信: 未実施。EAS Updateか新binaryかはnative互換性確認後に決める。
- 端末確認: COOP一覧GET、手動POST、分類PUT後GET、献立の確認表示、レシピ保持、保存失敗表示を対象端末で確認する。実データに影響する操作の確認方法は別途決める。
- rollback: 直前の安定版updateを対象branchへ再配信する方針。端末が取得済みbundleを切り替える時期、再起動、cache、runtime互換性を確認する。分類JSONやFirestoreへ既に書かれた値はclient rollbackだけでは戻らない。
- 配信後の記録: update group/build ID、配信時刻、対象platform、端末確認結果を本記録に追記する。

## 承認と状態

- app owner: Claudeへ端末配信を依頼する方針。対象releaseを特定した配信の個別承認は未取得。
- VPS management review: 未実施。
- VPS production approval: 該当する操作なし。
- client distribution: not_started。

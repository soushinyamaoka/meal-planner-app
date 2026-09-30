# Server Change Notice

record_type: server_change
template_type: full
policy_bundle_version: 2026-09-05.1
notice_id: 20260930-MEALPLANNER-001
app: meal-planner-app
source_branch: main
source_commit: 4facc8a98f5be987d168797831416e53ebdf6d7b
production_baseline_commit: null
coop_api_deployed_source_commit: f4259490f78f5b358a6eec938e86281148866394
release_commits: 既知のrepository比較元 `20e7c90bb558f8e97f7da838cac127880b2ab1af` からsourceまでは `4facc8a98f5be987d168797831416e53ebdf6d7b` の1commit。端末配信済みsourceは未確認のため、実際のclient release全範囲は未確定。
impact_level: L3
status: ready_for_review
created_by: Codex
production_change: none
vps_management_handoff: required
deployment_status: not_started
client_distribution: required
client_distribution_status: not_started
client_release_record: ops/client-releases/20260930-MEALPLANNER-001-summary.md

## 変更概要

モバイルアプリ側の未反映改修 `20260930-002`〜`006`、JSX構文修正 `20260930-008`、文書・typecheck整備をまとめて知らせる。COOP APIへの呼出し順序と既存 `PUT /api/coop/classify` の利用開始がVPS管理上の主な論点。本noticeは提出前の草案。

## 変更理由

レシピURLの参照維持、保存失敗の表示、COOP一覧の読み込みと手動取得の分離、献立の一括追加確認、商品カテゴリ手動修正を提供するため。

## server_impact判定

server_impact: notify

VPS上のcode・設定・配布物は今回変更していない。既存COOP APIへのアクセス方法が変わり、カテゴリ修正によって `/opt/apps/coop-api/data/category_overrides.json` が更新され得るため、VPS管理へL3として通知する。本notice自体の `production_change` は `none`。分類PUTの並行更新対策とCOOPバックアップの復旧・隔離復元はVPS管理側が別途扱う。端末配信は両作業の完了まで保留し、別承認を要する。

## 現在と変更後

| 項目 | 現在のローカルHEAD | 今回の候補source |
|---|---|---|
| レシピURL付きデータ | 一覧から削除時にFirestore文書も消し得る | 一覧から外し、URL付きレシピ文書を保持する |
| Firestore保存失敗 | 非同期書込失敗を画面へ集約表示しない | 失敗時にバナー表示。オフライン保留中は即失敗としない |
| COOPタブ初期表示 | 起動時に `POST /api/coop/fetch` 後、一覧GET | 起動時は `GET /api/coop/ingredients` のみ。POSTは明示操作時 |
| COOP献立一括追加 | 既存献立の日にも確認なしで追記 | 重複日を示し、確認後に追記 |
| COOP商品分類 | 端末からの修正操作なし | 明示操作で既存 `PUT /api/coop/classify` を呼び、結果をGETで確認 |
| 開発文書・型確認 | 旧記述、型確認scriptなし | 現行実装へ訂正し `npm run typecheck` を追加 |

## 影響対象

- service/container: `coop-api` は既存のまま。VPS管理から2026-09-30に稼働commitを `f4259490f78f5b358a6eec938e86281148866394` と訂正する指示を受けた。同commitのソースにGET・POST・PUT各endpointが存在することをローカルGitで確認した。VPSへ直接接続して稼働物を確認していない。こちらから参照できるVPS管理の `production_deployments.yaml` は旧 `f26c2119ac5b3677916e5e4afe02242565a6da4f` のままであり、正本更新はVPS管理側に委ねる。
- URL/port/health: 変更なし。既存のCOOP API接続先を利用する。新規公開endpointなし。
- cron/timer/worker: 変更なし。既存のメール定期取込との重複を減らすため、端末起動時の手動POSTを廃止する。
- dependency: `package.json` に `typecheck` scriptを追加。依存version、`package-lock.json`、Expo設定は変更なし。VPS依存の変更なし。
- data/DB/volume: COOP分類の保存先は既存 `category_overrides.json`。端末側Firestoreではレシピ削除の意味と献立追記の確認が変わる。schema・migrationなし。
- log/monitoring: VPS側のlog形式・監視設定は変更なし。COOP手動POST頻度は利用者操作に依存する。

## production変更

- 必要性: 本noticeの範囲ではなし。分類PUTの並行更新対策とCOOPバックアップの復旧・隔離復元はVPS管理側の別作業。端末配信は別承認・別記録とする。
- 想定作業: 本noticeにVPSへの配置、再起動、env変更は含めない。VPS管理側の別作業の完了が端末配信の前提となる。
- downtime: VPSサービス停止は想定しない。端末配信時の利用者影響は別記録で扱う。
- maintenance window: VPS側は不要と見込むが、L3のためVPS管理判断を待つ。

## 利用者への影響

- user_maintenance_impact: possible
- 対象利用者・機能: COOPの初回表示、手動メール取得、カテゴリ、献立作成、レシピ、Firestore保存失敗表示。旧端末版は引き続き起動時POSTを行い得る。
- 通知方法: VPS停止告知の要否はVPS管理側判断。端末配信案内はアプリ側で別判断。

## env・secret contract

- 変更: なし。既存COOP URL・Bearer token設定を使用する。
- 変数名・secret種類のみ: `EXPO_PUBLIC_COOP_API_URL`、`EXPO_PUBLIC_COOP_API_TOKEN`。値は確認・記録していない。
- provisioning/rotation: 今回なし。

## Data・migration・backup

- schema/format変更: なし。分類PUTは既存JSONの同じ商品名の上書き分類を変更する。
- migration: なし。アプリのURL付きレシピは今後の一覧削除でFirestoreに残る。既に削除済みの文書は自動復元されない。
- 同時実行・retry: 端末内では取得と分類操作を直列化する。別端末・定期取込との同時実行は未検証。baselineの分類PUTはJSON全体をread-modify-writeするため、並行PUTで更新喪失の可能性があり、VPS管理レビュー事項。PUT成功後GETに失敗した場合は結果不明としてGETのみ再試行し、PUTを自動再送しない。手動fetch失敗後も保存済み一覧GETを試す。
- backup対象: VPS管理の `OPS-BKP-04` は `/opt/apps/coop-api/data` 全体の日次backupを対象とし、分類JSONを含む設計。今回の端末配信前に、VPS管理側で直近archiveの鮮度・完全性と分類JSONの退避要否を確認する。Firestoreの世帯データbackup方針は未確認。
- restore確認: 分類JSONの実backupから隔離先への復元と内容検証は今回未実施。データ復元が必要なら、書込停止、現行dataの別途保全、隔離復元、checksum確認、影響する注文データとの差分確認をVPS管理側の個別計画で定める。端末側のFirestoreデータも復元元と対象世帯を確定するまで一括復元しない。
- backward compatibility: 既存endpointと形式を利用するため、新旧端末が同じserverを利用できる想定。分類JSONへの書込を伴う実機互換性は未確認。

## Deploy・rollback

- deploy前提: 型チェックはタスク008で成功。source固定とVPS管理reviewに加え、分類PUTの並行更新対策とCOOPバックアップの復旧・隔離復元の完了を確認するまで端末配信を保留する。その後も端末配信計画とapp ownerの別承認を要する。
- deploy手順の変更: VPSの配布経路は変更しない。アプリはEAS側の配信であり、VPSの `deploy-files.txt` や `deploy.sh` の対象ではない。
- rollback方法: VPS artifactのrollbackは該当なし。端末配信のrollbackは直前の安定版を再配信する計画とし、対象branch・update groupは配信前に確定する。分類JSONの既書込値は端末版を戻しても戻らず、誤分類は個別修正または隔離検証したbackupからの復元を要する。
- rollback不能条件: 直前の安定版、端末runtime互換性、分類JSONの復元元が確定できない場合は即時配信・復元しない。後続の注文・分類更新を無条件に巻き戻さない。

## Health・テスト

- health contract変更: なし。VPS既存healthに変更なし。
- 実施テスト: 2026-09-30の初回 `npm run typecheck` は `App.tsx` のJSX構文エラー（`TS1005`、`TS1128`、`TS1381`）で失敗。タスク008で `React.Fragment` により修正し、実行担当の再実行は終了コード0、TypeScriptエラーなし。`git diff --check -- App.tsx` も空白エラーなし。
- 結果: ソース上の構文・型確認は成功。実機・実APIでの動作は未確認。
- 未実施テストと理由: 実機、実API、Firestore実データ、旧端末版との互換確認は未実施。VPSへの接続・操作も未実施。

## Log・監視

- log量/形式/保存先変更: VPS側の実装変更なし。POSTの減少、GET・PUTの利用変化が見込まれるが実測なし。
- 新しいalert条件: 今回は定義しない。分類PUTの失敗・競合とGET失敗を監視する必要性はVPS管理側判断。
- secret/個人情報対策: 通知書に商品名、token、env値、raw API responseを記録しない。

## 提出前セルフチェック

2026-09-30 16:57 JST、初回提出前のセルフチェックを1回実施。正本はVPS管理repositoryの `docs/templates/application_ai_operations_instruction.md`（policy `2026-09-05.1`）、`docs/operations/application_change_notification_policy.md`、`docs/runtime-state/production_deployments.yaml`、`docs/templates/server_change_notice_pre_submission_checklist.md`。本モバイルアプリは配布版ポリシーの対象外なので、正本を直接読んだ。

- [x] source `4facc8a98f5be987d168797831416e53ebdf6d7b` とnotice初版 `fd0057925756ded72073f5e9a85772c4b99997c0` を `main` にpushし、local・cached origin・実remoteが `fd0057925756ded72073f5e9a85772c4b99997c0` で一致、tracked dirty 0・untracked 0を確認した。本セルフチェック追記は後続の文書commitとしてpushし、実remoteを再照合する。
- [x] 既知のrepository比較元 `20e7c90bb558f8e97f7da838cac127880b2ab1af` からsourceまでの1commit・8ファイル（アプリ3、文書4、`package.json`）を確認した。`package-lock.json`、`app.config.js`、`eas.json`、native設定、VPS deploy fileは不変。`package.json` はscriptのみ追加。source以降の2文書はnotice・client配信計画で、アプリbuild入力ではない。
- [x] 初回セルフチェック時、参照可能なVPS管理正本はCOOP APIを旧 `f26c2119ac5b3677916e5e4afe02242565a6da4f` と表示していた。その後、VPS管理の受理・blocked通知で稼働commitを `f4259490f78f5b358a6eec938e86281148866394` と訂正するよう指示された。後者のローカルGitにGET・POST・PUT endpointがあることを増分確認した。今回のnoticeではVPS code・env・起動・port・health・cron・log・配布経路を変更しない。L3は既存分類JSONへの書込開始によるdata影響。本noticeのproduction変更はなしとし、対策・復旧はVPS管理側の別作業とした。
- [x] 空欄の元商品名・変更なしは端末側で保存不可。旧端末版は起動時POSTを継続し得る。端末内の同時リクエストは抑止し、分類PUTの結果不明時はGETのみ再試行する。別端末の同時PUTにはserver側のlost updateリスクが残る。献立一括追加は確認後も複数Firestore書込であり、途中失敗時の原子性はない。保存失敗は拒否後に表示し、保留中の書込成功は保証しない。
- [x] COOP data全体はVPS管理の `OPS-BKP-04` の日次backup対象であり、分類JSONを含む。端末rollbackでは既書込分類は戻らない。隔離restore、現行dataの保全、書込停止、復元後の確認が必要で、実復元は未実施。Firestore側のbackup・rollbackは未確認。
- [x] `npm run typecheck` はタスク008後に終了コード0。`git diff --check` は空白エラーなし。read-only preflightの機微値候補は0件。`.env` と生成物はGit除外され、source/notice commitに含まれない。`.env` の値は読んでいない。
- [ ] VPS正本に本モバイルアプリのproduction baseline entryがなく、実端末の配信済みsourceも未確認。baselineからのclient release全差分は照合できない。`app.config.js` は `runtimeVersion.policy: sdkVersion`、EAS profileのchannel定義は確認したが、実際の対象branch・platform・native fingerprint・配布file一覧は未確認。`.easignore` はなく、EAS artifactへの `.env`・一時file非混入は未確認。
- [ ] 初回のread-only preflightは `blocked`（当時の `draft` statusとモバイルアプリbaseline未登録）。VPS管理は通知を受け付けたうえでblockedと判定し、COOP API稼働commitの訂正と `ready_for_review` への更新を指示した。モバイルアプリの `production_baseline_commit: null` は維持し、COOP APIのcommitを別欄へ記載する。実VPSと端末配布物の直接照合は未確認。production変更と端末配信は未実施。

指摘後の増分確認（前回の通知commit `0fcd24e8647fcc2fc8aecd178ea54ca5123e92f2`）: アプリsource `4facc8a98f5be987d168797831416e53ebdf6d7b` は不変。今回の変更は本noticeと端末配信計画の2文書のみ。COOP APIのローカルcommit `f4259490f78f5b358a6eec938e86281148866394` で利用endpointを確認し、稼働commitの訂正、`ready_for_review`、別作業の責務、端末配信保留を照合した。今回のcommitと実remoteの一致は再提出時の引き継ぎで示す。

## 未解決事項

1. VPS正本の本モバイルアプリbaselineは存在しない。VPS管理が本noticeを受け付け、statusを `ready_for_review` にするよう指示したため、nullのまま明記する。配信済みsourceと実EAS artifactの調査は端末配信担当Claudeへ引き継ぐ。
2. EASへ実際に渡るfile一覧、`.env`・一時file非混入、配信branch/channel、対象platform、native fingerprint、直前安定版は未確認。端末配信前にClaudeが確認する。
3. 分類PUTの並行更新対策とCOOPバックアップの復旧・隔離復元はVPS管理側の別作業で、完了報告は未受領。完了まで現候補の端末配信を保留する。Firestore側rollback方針も未確認。
4. こちらから参照できるVPS管理の `production_deployments.yaml` は旧COOP API commitのまま。稼働commit `f425949` の根拠・正本更新状況はVPS管理側で確認する。

## 希望時期

source固定と初回提出前セルフチェックは完了。VPS管理からの指摘箇所と今回の文書差分を増分確認して `ready_for_review` として再提出する。分類PUTの並行更新対策とCOOPバックアップの復旧・隔離復元が完了するまで端末配信は保留。完了後もClaudeが配信対象を提示し、app ownerの個別承認で決める。

## VPS管理チャットへの引き継ぎ

- 引き継ぎ要否: 必要。
- ユーザーへの案内: 本チャットの回答で、VPS管理の既存blocked通知に対する再提出を案内する。
- VPS管理チャットへ渡すpath: `ops/server-change-notices/20260930-MEALPLANNER-001-summary.md`（repository相対path。最終案内ではローカル絶対pathを提示する）。

## Approval

- app owner: 改修実施、通知提出に必要なsourceとnoticeのcommit・pushを2026-09-30に承認。端末配信の個別承認は未取得。
- VPS management review: 2026-09-30に通知を受け付け、`blocked`。COOP API稼働commit訂正と `ready_for_review` への更新を指示。
- production approval: なし。VPS作業の予定なし。端末配信は別承認。
- related task_id: 20260930-002〜006、008。007は設計担当が直接実施。

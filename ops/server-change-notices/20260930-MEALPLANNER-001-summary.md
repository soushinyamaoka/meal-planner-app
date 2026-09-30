# Server Change Notice

record_type: server_change
template_type: full
policy_bundle_version: 2026-09-05.1
notice_id: 20260930-MEALPLANNER-001
app: meal-planner-app
source_branch: main
source_commit: 4facc8a98f5be987d168797831416e53ebdf6d7b
production_baseline_commit: null
release_commits: 既知のrepository比較元 `20e7c90bb558f8e97f7da838cac127880b2ab1af` からsourceまでは `4facc8a98f5be987d168797831416e53ebdf6d7b` の1commit。端末配信済みsourceは未確認のため、実際のclient release全範囲は未確定。
impact_level: L3
status: draft
created_by: Codex
production_change: uncertain
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

VPS上のcode・設定・配布物は今回変更していない。既存COOP APIへのアクセス方法が変わり、カテゴリ修正によって `/opt/apps/coop-api/data/category_overrides.json` が更新され得るため、VPS管理へL3として通知する。現状はVPS側の配布を予定しないが、分類PUTの並行更新対策が必要かVPS管理reviewで判断するため、production変更の要否を `uncertain` とする。端末配信は別承認。

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

- service/container: `coop-api` は既存のまま。baseline `f26c2119ac5b3677916e5e4afe02242565a6da4f` のソースにGET・POST・PUT各endpointが存在することをread-onlyで確認した。実VPSでの稼働状態は未確認。
- URL/port/health: 変更なし。既存のCOOP API接続先を利用する。新規公開endpointなし。
- cron/timer/worker: 変更なし。既存のメール定期取込との重複を減らすため、端末起動時の手動POSTを廃止する。
- dependency: `package.json` に `typecheck` scriptを追加。依存version、`package-lock.json`、Expo設定は変更なし。VPS依存の変更なし。
- data/DB/volume: COOP分類の保存先は既存 `category_overrides.json`。端末側Firestoreではレシピ削除の意味と献立追記の確認が変わる。schema・migrationなし。
- log/monitoring: VPS側のlog形式・監視設定は変更なし。COOP手動POST頻度は利用者操作に依存する。

## production変更

- 必要性: 未確定。既存APIのままで安全に利用できるかVPS管理側が判断する。端末配信は別承認・別記録とする。
- 想定作業: VPS管理側は既存endpoint・永続データ・backup・監視影響をreviewする。server修正が必要なら別の変更範囲と承認を定める。本notice作成時点ではVPSへの配置、再起動、env変更はしない。
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

- deploy前提: 型チェックはタスク008で成功。source固定とVPS管理review、端末配信計画とapp ownerの別承認を要する。
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

正式な1回の提出前セルフチェックは、sourceとnoticeをremoteへpushした後、VPS管理への初回提出直前に実施する。この草案では未実施。現時点のread-only調査で、VPS正本にモバイルアプリbaselineがなく、client配信済み版と実EAS artifactが未確認と分かった。typecheckの初回失敗は修正・再実行で解消済み。

## 未解決事項

1. モバイルアプリの配信済みsource、対象EAS branch/channel、直前安定版、対象platform、native fingerprintの確認。VPS正本にモバイルアプリbaselineがないため、VPS稼働commitからのrelease差分という形では照合できない。
2. source commitは上記へ固定した。noticeのcommit・pushと実remote一致確認は未実施。
3. 実際のEAS配布file一覧の確認。`.env` は存在するがGitから除外済みで、内容は読んでいない。`.easignore` はない。EAS artifactへ `.env` や一時fileが入らないことは未確認。
4. 分類PUTの並行更新、backupの直近状態、隔離復元、Firestore側rollback方針のVPS管理レビュー。

## 希望時期

source固定と提出前セルフチェック後にVPS管理レビューを依頼する。端末配信時期は別承認で決める。

## VPS管理チャットへの引き継ぎ

- 引き継ぎ要否: 必要。
- ユーザーへの案内: 未実施。通知書が `ready_for_review` になった時点で提示する。
- VPS管理チャットへ渡すpath: `ops/server-change-notices/20260930-MEALPLANNER-001-summary.md`（repository相対path。最終案内ではローカル絶対pathを提示する）。

## Approval

- app owner: 改修実施、通知提出に必要なsourceとnoticeのcommit・pushを2026-09-30に承認。端末配信の個別承認は未取得。
- VPS management review: 未実施。
- production approval: なし。VPS作業の予定なし。端末配信は別承認。
- related task_id: 20260930-002〜006、008。007は設計担当が直接実施。

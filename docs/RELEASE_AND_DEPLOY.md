# リリース・デプロイ手順（献立ノート）

献立ノート（meal-planner-app）と、連携するサーバー（主に coop-api）のリリース方法をまとめる。2026-10 時点で実際に行った手順を正とし、確認できていないことは「未確認」と書く。秘密値・接続先の実値（URL・IP・トークン）は、ここに書かない（`.env` と各リポジトリの設定を参照）。

## 1. 構成

| 構成要素 | 置き場所 | 本番の更新方法 | 本番の管理 |
|---|---|---|---|
| アプリ（meal-planner-app） | Expo SDK 57（React Native）。Android実機は EAS Build のAPK、iOSは Expo Go | **EAS Update**（OTA）。ネイティブ変更があるときだけ EAS Build | アプリ側（app owner の承認で Claude が実施） |
| 献立・レシピ・世帯のデータ | Firebase（Auth・Firestore） | アプリから同期 | — |
| coop-api（COOP注文メールの取込・API） | VPS1。runtime user `coop-api`、`127.0.0.1:8003`、HTTPSの入口経由で公開 | 変更通知書 → VPS管理のレビュー・承認 → VPS管理が反映 | VPS管理 |
| レシピ生成・検索・抽出の各API | VPS1（recipe-generator・recipe-search・recipe-scraper） | 各リポジトリの手順と変更通知書 | VPS管理 |
| お知らせ（ベル・メンテナンスバナー） | VPS2 の公開feed | VPS管理側が公開 | VPS管理 |

アプリが使う接続先は、環境変数（`EXPO_PUBLIC_COOP_API_URL`・`EXPO_PUBLIC_WEB_API_URL`・`EXPO_PUBLIC_SCRAPER_API_URL`・`EXPO_PUBLIC_NOTICES_FEED_URL`・Firebase の各値）で渡す。項目名は `.env.example` を参照。EAS の環境変数は **`preview` 環境**にだけ設定されている（`production` は空）。

## 2. アプリのリリース（EAS Update）

### 2.1 前提

- `app.config.js` の `runtimeVersion.policy` は `sdkVersion`（runtime は `exposdk:57.0.0`）。同じSDKの中のネイティブ変更は区別できないため、**ネイティブ変更（ネイティブモジュールの追加・削除、config plugin、権限など）があるときは EAS Update で配信しない**。その場合は新しいbinary（EAS Build）を先に配布する。
- channel は2つあり、**コードを配信するときは原則として両方に配信する**。
  - `android-internal`: Android実機（APK）が読む。
  - `default`: Android/iOS 共通。**iOS の Expo Go もこれを読む**（ローカルの開発サーバーには接続していない）。
- 配信は、対象のreleaseを特定した **app owner の明示承認**の後にだけ行う。VPS の本番承認を、端末配信の承認として流用しない。

### 2.2 手順

1. **配信前の確認**
   - `git status` で作業ツリーがclean。
   - `npm run typecheck` が終了コード0。
   - 前回の配信sourceから、`package.json`・`package-lock.json`・`app.config.js`・`eas.json` に差分が無いこと（`git diff --stat <前回のsource>..HEAD -- package.json package-lock.json app.config.js eas.json`）。差分があればネイティブ変更の有無を確認する。
   - `eas whoami` でログイン済み。
2. **配信記録を作る**: `ops/client-releases/YYYYMMDD-MEALPLANNER-NNN-summary.md`。書く内容は、配信対象、source commit、channel・runtime・platform、サーバーとの前後関係、配信前確認、直前の安定版（rollback先の update group ID）、承認。
3. **commit して push**し、`git rev-parse HEAD` と `git ls-remote origin refs/heads/main` が一致することを確認する。source commit 以降の差分が `ops/` の文書だけであることも確認する（`git diff --stat <source>..HEAD -- . ':!ops'` が空）。
4. **配信**（両方の channel）:

   ```bash
   eas update --channel android-internal --environment preview --message "<release id> (source <短いhash>)" --non-interactive
   eas update --channel default          --environment preview --message "<release id> (source <短いhash>)" --non-interactive
   ```

5. **配信記録に追記**: 各 channel の update group ID、Android/iOS の update ID、配信日、端末確認の項目。commit して push。
6. **端末確認**: アプリを一度完全に閉じて開き直すと、新しいbundleに切り替わる（次回起動以降）。確認項目は配信記録に書いたものを使う。献立の置き換えなど実データを変える操作の確認は、使っていない日付で行う。

### 2.3 rollback

- 直前の安定版の update group を、同じ channel へ再配信する（`eas update:republish`）。端末が切り替わるのは次回起動以降。
- Firestore に書かれたデータ（レシピ・献立）は、アプリのrollbackでは戻らない。

## 3. サーバー（coop-api）のリリース

サーバーの本番反映は、**VPS管理側が承認して実施する**。アプリ側（このチャット）は、実装・テスト・変更通知書の作成までを行い、本番へは接続・変更しない。

### 3.1 流れ

1. 実装・テスト（`pytest`）。実際のメールなど個人データは、テストやリポジトリに入れない（書式を写した合成データを使う）。
2. **変更通知書**を作る: coop-api の `ops/server-change-notices/YYYYMMDD-COOPAPI-NNN-summary.md`。テンプレートと方針の正本は VPS管理リポジトリの `docs/templates/`・`docs/operations/`（読むだけで編集しない）。
3. commit して push し、実remote と一致させてから、`status: ready_for_review` にする。
4. **VPS管理チャット**へ、通知書のローカル絶対pathを渡し、受理台帳への登録とレビューを依頼する（「production反映は別承認として扱ってください」と添える）。
5. VPS管理側が、preflight（`tools/review_notice_preflight.ps1`。PowerShell 7 が必要で、アプリ側の PowerShell 5.1 では動かない）と、本番の稼働hashとの照合を行う。指摘があれば直して再提出する。
6. 技術受理の後、**本番反映は別承認**。反映・データ操作は VPS管理側が行い、結果をアプリ側へ報告する。
7. 反映の報告を受けたら、coop-api の `ops/runtime-contract.yaml` を反映済みの内容に更新する。

### 3.2 変更通知書で指摘を受けやすい点（2026-10 の実績）

- `production_baseline_commit` は **SHA単体**で書く（説明は別の節へ）。
- `release_commits` は、baseline から `source_commit` までの**全commit**を `git rev-list --reverse <baseline>..<source>` で機械的に出す（手で選ばない）。
- 永続データの値や意味を変える変更は、schema が不変でも **L3**。
- **成功・失敗・未実行の分岐を、最初から表にする**（ジョブの `job_end.status`、CLI の終了コード、ログの対応。終了コードとログの判定が違う場合はそれも書く）。
- **データを書き換える手順を書いたら、その rollback 手順も同時に書く**（保護backup、作業前の記録は値のみ、復元の条件と手順、所有者・権限の維持、artifact の rollback とデータの rollback を分ける）。
- 「未確認」と書いた事項は、確認がとれたら記述を更新する（古い「未確認」が残ると指摘される）。

### 3.3 サーバーとアプリの順序

- アプリが新しいAPI項目に依存する場合は、**サーバーの本番反映と確認の後に**アプリを配信する。
- アプリは、項目が無い旧APIでも壊れないように作る（例: 注文の日付の見出しは、`order_date_source` が無ければ従来の「注文日」）。

## 4. Codex への作業依頼（ai-watch）

実装は、原則として Codex に指示書で依頼する（Claude は設計・指示書・レビュー）。

1. 各リポジトリの `work/ai_handoff/claude_to_codex/draft/task.md` に下書きする（git の対象外）。
2. app owner に、目的・主要な変更・production への影響・リスクを示し、**inbox へ配置してよいか**の明示承認を得る。
3. 承認後、`task_id: YYYYMMDD-NNN`（連番は全リポジトリ通し）、`approval_status: approved`、`approved_by: user` にして `inbox/task.md` へ置く。ai-watch が1件ずつ順に実行する。
4. **配置前に、ai-watch の事前検査を自分で通す**。特に「production変更」の節は、行頭が「なし」「行わない」「実施しない」「禁止」のどれかで始まらないと、実行前に止められる（Codex が本番を触らない場合は「- なし。このtaskでは…行わない。」で始める）。
5. 結果は `outbox/result.md`。**result の自己申告をそのまま信じず**、Claude が実際に動かして確認する（過去に「すべてpassed」でも重大な不具合があった）。
6. Codex の実行環境では `.git` が読み取り専用のため、**commit は Claude がレビュー後に行う**。

指示書を書くときの注意:

- 「仕様にない判定・推測を追加しない」と明記する。
- 例やテストデータに、実データ（金額・番号・URL・メール本文）を書かない。
- 検証のケースに、現実的な入力（実際のAI回答のように句点で終わる文や、チャットからのコピーで改行が崩れた形）を入れる。

## 5. 未確認・未整備の事項

- VPS管理側の `docs/runtime-state/production_deployments.yaml` の coop-api の記載が古いまま（2026-08-30 の commit）。本番の稼働hashは、その都度 VPS管理側に照合してもらっている。
- recipe-generator・recipe-search・recipe-scraper の個別のリリース手順は、この文書では扱っていない（各リポジトリの文書を参照）。
- iOS は Expo Go で運用しており、App Store・TestFlight での配布は行っていない。

# 献立ノート（Meal Planner）

夕食の献立、レシピ、COOPの注文食材を扱うReact Native / Expo（SDK 57）のアプリです。この文書はリポジトリ内の実装を説明します。アプリの配信状況やproductionへの反映状況は示しません。

## 開発環境の準備

1. リポジトリのアプリディレクトリで `npm install` を実行します。
2. `.env.example` を参考に、利用する機能に必要な環境変数を手元の `.env` に設定します。Firebaseと各APIの設定値は環境ごとに用意し、秘密値をGitや文書に書かないでください。
3. `npm start`（または `npx expo start`）でExpoを起動します。

TypeScriptの型を確認するときは `npm run typecheck` を実行します。

## 主な機能

- **献立**: 当日から14日後までの献立と、過去7日分のアーカイブを表示・編集します。
- **レシピ**: 登録、編集、WEB検索を行います。
- **COOP**: 保存済み注文食材の表示、手動メール取得、カテゴリ手動修正、レシピ提案、献立プラン作成を行います。
- **給食**: 世帯の給食データを表示します。
- **世帯・お知らせ**: ログインと世帯の管理、お知らせの表示を行います。

献立、レシピ、カテゴリ、給食の同期にはFirestoreを使います。AsyncStorageは取得済みデータを表示するためのローカルキャッシュで、保存先の正本はFirestoreです。ログイン状態はFirebase AuthのReact Native用永続化を使います。COOP APIのURL・トークンは環境変数を初期値とし、端末のSecureStoreに保存されます。

COOPとレシピ検索は `src/api/index.ts` の実API関数を呼びます。COOPタブの起動時は保存済み食材をGETし、メール取得POSTは画面から明示操作した場合に使います。APIの入出力は `docs/API_SPEC.md`、残存するサンプルデータの扱いは `docs/MOCK_IMPLEMENTATIONS.md` を参照してください。

## 主な構成

```text
App.tsx                     主要タブと画面の組み立て
index.ts                    Expoエントリポイント
src/api/index.ts            レシピ検索・COOP API
src/api/notices.ts          お知らせ取得
src/config/                 Firebase・COOP設定
src/hooks/                  認証、世帯、Firestore、給食、お知らせ
src/screens/                ログイン・世帯関連画面
src/components/             共通UI
src/data/sampleData.ts      残存サンプルと使用中のカテゴリ定義
src/utils/                  日付処理とローカルキャッシュ
docs/                       API仕様と実装状況
```

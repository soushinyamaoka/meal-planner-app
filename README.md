# 献立ノート（Meal Planner）

日々の夕食献立を管理するスマホアプリ（React Native / Expo Go）

## セットアップ手順

### 1. zipを展開

```bash
unzip meal-planner-app.zip
cd meal-planner-app
```

### 2. 依存パッケージをインストール

```bash
npm install
```

### 3. Expo Go で起動

```bash
npx expo start
```

スマホの Expo Go アプリでQRコードを読み取ると起動します。

## 主な機能

- **📅 献立タブ**: 日別の献立管理（今日〜14日後 + 過去7日アーカイブ）
- **📖 レシピタブ**: レシピの登録・管理・WEB検索
- **🛒 COOPタブ**: COOP注文食材からレシピ提案・献立自動作成

## 仮実装について

現在、以下の機能はダミーデータ・仮APIで動作しています。

- レシピWEB検索（Claude API使用）
- COOP注文食材取得（ダミーデータ）
- COOPレシピ提案（ダミーデータ）
- COOP献立自動作成（ダミーデータ）
- データ永続化（未実装・リロードでリセット）

詳細は `docs/MOCK_IMPLEMENTATIONS.md` を参照してください。

## ディレクトリ構成

```
├── App.js              ← メインアプリ
├── src/
│   ├── api/index.js    ← API関数（差し替えポイント）
│   ├── data/sampleData.js ← サンプルデータ
│   └── utils/helpers.js   ← ユーティリティ
├── docs/
│   ├── PROJECT_RULES.md   ← プロジェクト指示文
│   ├── API_SPEC.md        ← COOP API仕様書
│   └── MOCK_IMPLEMENTATIONS.md ← 仮実装一覧
```

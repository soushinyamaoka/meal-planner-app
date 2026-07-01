# 仮実装一覧（MOCK_IMPLEMENTATIONS）

このドキュメントでは、現在ダミーデータ・仮APIで動作している箇所と、本実装時の差し替え手順を記載します。

---

## 1. レシピWEB検索（`src/api/index.js` → `searchRecipeFromWeb`）

| 項目 | 内容 |
|------|------|
| 現在 | Claude API (web_search) を使用 |
| 将来 | 独自APIに差し替え |
| 差し替え方法 | 関数内のfetch先URLとリクエスト形式を変更 |
| 引数 | `query: string` |
| 返り値 | `{ name, ingredients[], steps[], url? }` |

---

## 2. COOP注文食材取得（`src/api/index.js` → `fetchCoopIngredients`）

| 項目 | 内容 |
|------|------|
| 現在 | `src/data/sampleData.js` のダミーデータを返却 |
| 将来 | `GET /api/coop/ingredients` に差し替え |
| 差し替え方法 | コメントアウトされた実API呼び出しを有効化し、ダミー部分を削除 |
| 認証 | `Authorization: Bearer <TOKEN>` ヘッダーが必要 |

---

## 3. COOPレシピ提案（`src/api/index.js` → `suggestCoopRecipes`）

| 項目 | 内容 |
|------|------|
| 現在 | 固定のダミーレシピ2件を返却 |
| 将来 | `POST /api/coop/suggest-recipes` に差し替え |
| 差し替え方法 | コメントアウトされた実API呼び出しを有効化 |
| リクエスト | `{ ingredients[], season?, genre?, servings?, mode? }` |

---

## 4. COOP献立自動作成（`src/api/index.js` → `createCoopMealPlan`）

| 項目 | 内容 |
|------|------|
| 現在 | 固定の3日分ダミープランを返却 |
| 将来 | `POST /api/coop/meal-plan` に差し替え |
| 差し替え方法 | コメントアウトされた実API呼び出しを有効化 |
| リクエスト | `{ ingredients[], season?, servings?, simple_mode? }` |

---

## 5. サンプルデータ（`src/data/sampleData.js`）

| 項目 | 内容 |
|------|------|
| `sampleRecipes` | デモ用レシピ4件。本実装時はAsyncStorageやDBから読み込みに変更 |
| `sampleMenus` | デモ用献立データ。同上 |
| `COOP_DUMMY_DATA` | COOP注文のダミーデータ。実API接続後は不要 |
| `COOP_CATEGORIES` | カテゴリ定義。本実装でもそのまま使用可能 |

---

## 6. データ永続化（未実装）

| 項目 | 内容 |
|------|------|
| 現在 | Reactのステート管理のみ（アプリ再起動でリセット） |
| 将来 | AsyncStorage または SQLite で永続化 |
| 対象 | `menus`, `recipes` のデータ |

---

## 7. COOPカテゴリ修正（未実装）

| 項目 | 内容 |
|------|------|
| API | `PUT /api/coop/classify` |
| 内容 | 商品カテゴリを手動修正して学習データに保存 |
| 状態 | 未着手。後日追加予定 |

---

## 差し替え時の共通手順

1. `src/api/index.js` の先頭にある `API_BASE_URL` と `API_TOKEN` を設定
2. 各関数内のコメントアウトされた実API呼び出しを有効化
3. ダミーデータ部分（`await new Promise(...)` ～ `return ...`）を削除
4. 動作確認

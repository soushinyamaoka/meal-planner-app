# 仮実装とサンプルデータの現状

このファイル名は既存の参照との互換性のために残しています。以下はリポジトリ内のソースで確認できる実装状況です。実機動作やproductionへの反映状況を示すものではありません。

## APIを呼ぶ機能

| 機能 | 現在のアプリ実装 |
|------|------------------|
| レシピWEB検索 | `src/api/index.ts` の `searchRecipeFromWeb` がレシピ検索APIへPOSTします。固定のダミーレシピは返しません。 |
| COOP注文食材 | `fetchCoopIngredients` が `GET /api/coop/ingredients` を呼びます。起動時は保存済み一覧のGETのみです。 |
| COOPメール手動取得 | 画面からの明示操作で `triggerCoopFetch` が `POST /api/coop/fetch` を呼び、その後に一覧をGETします。 |
| COOPレシピ提案 | `suggestCoopRecipes` が `POST /api/coop/suggest-recipes` を呼びます。 |
| COOP献立プラン | `createCoopMealPlan` が `POST /api/coop/meal-plan` を呼びます。 |
| COOP商品カテゴリ修正 | `classifyCoopProduct` が `PUT /api/coop/classify` を呼び、保存後に一覧をGETします。同じ元の商品名に対する上書き分類です。 |

これらの関数は `src/config/coopConfig.ts` などの設定管理を通して接続先を取得します。COOPのURLとトークンは環境変数を初期値とし、SecureStoreに保存します。ソースに接続先や秘密値を書き込む差し替え作業は不要です。APIの入出力は `docs/API_SPEC.md` を参照してください。

## データの保存とキャッシュ

- 献立・レシピ・レシピカテゴリは `src/hooks/useFirestore.tsx` でFirestoreと同期します。給食データは `src/hooks/useNurseryMenus.tsx` が読み込みます。
- `src/utils/localCache.ts` は取得済みの献立・レシピ・カテゴリ・給食をAsyncStorageへキャッシュします。キャッシュは表示補助で、Firestoreの代わりの正本ではありません。
- ログイン状態の永続化にはFirebase AuthのReact Native用AsyncStorage設定を使用します。

## `src/data/sampleData.ts` の扱い

| 定義 | 現在の用途 |
|------|------------|
| `sampleRecipes`、`sampleMenus` | デモ用定義として残っています。現行の画面データには使用していません。 |
| `COOP_DUMMY_DATA` | デモ用定義として残っています。COOP一覧の表示には使用していません。 |
| `defaultRecipeCategories` | Firestoreにカテゴリがない世帯の初期カテゴリ作成に使用します。 |
| `COOP_CATEGORIES` | COOP一覧の五つの表示カテゴリと手動修正の選択肢に使用します。 |

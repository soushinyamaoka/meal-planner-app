# プロジェクト指示文

## 基本ルール

### 1. 実装前の確認プロセス

- 実装に入る前に、理解した仕様を箇条書きで整理して提示すること。
- 不明点や曖昧な点があれば、推測で進めず必ず質問すること。
- 仕様の確認が取れてから実装を開始すること。

### 2. 影響範囲の事前調査

- 機能の追加・変更を行う際は、実装前に影響を受ける既存の画面・コンポーネント・ロジックを洗い出し、リストとして提示すること。
- 横展開が必要な箇所がある場合は、対応漏れがないよう明示すること。
- 影響範囲の確認が取れてから実装を開始すること。
- **レシピ入力フォームは `RecipeFormFull`（レシピタブ）と `RecipeFormInline`（献立タブ手入力）の2種類ある。** UI・動作に関する変更は、特に指定がない限り両方に適用すること。実装前に「両方に適用してよいか」を確認すること。

### 3. UI/UX に関するルール

- UI の変更や新規作成を行う場合は、コードを書く前に画面構成とユーザーの操作フローを説明すること。
- 参考 UI やデザイン指示がある場合はそれに従い、ない場合はシンプルで直感的な操作を優先すること。

### 4. 段階的な進め方

- 大きな機能は一度に実装せず、以下のような段階に分けて進めること。
  1. データ構造・設計方針の提示 → 確認
  2. 主要ロジックの実装 → 確認
  3. UI の実装 → 確認
  4. 結合・仕上げ → 確認
- 各段階でユーザーの確認を取ってから次に進むこと。

### 5. その他

- 問題報告時は、まず原因を説明し、修正不要な場合はその旨を先に伝える。修正が必要な場合のみ対応方針を提示する。すぐに修正に飛びつかない。

## Firestore 書き込みルール

Firestoreは `undefined` 値を持つフィールドを拒否する（`setDoc() called with invalid data` エラーになる）。

### ルール

**1. オブジェクトリテラルに `undefined` を含めない**

```ts
// ❌ NG
{ name: "焼き魚", recipeId: undefined }

// ✅ OK：省略可能フィールドは条件分岐で含める
const item: MenuItem = hasRecipe
  ? { name: "焼き魚", recipeId: id }
  : { name: "焼き魚" };
```

**2. 省略可能フィールド（`url?`, `categoryIds?` 等）を含むオブジェクトは `stripUndefined` を通してから書き込む**

`src/hooks/useFirestore.tsx` に `stripUndefined` ヘルパーを定義済み。Firestoreへの `setDoc` / `updateDoc` 呼び出し前に必ず使用する。

```ts
// ✅ OK
setDoc(ref, stripUndefined(data));
```

**3. Firestoreへの書き込みが絡む実装をした場合、省略可能フィールドの扱いを必ずチェックする。**

---

## 技術スタック

- React Native (Expo Go, SDK 54)
- TypeScript
- expo-secure-store（APIトークン・URL管理）
- 将来: AsyncStorage or SQLite（データ永続化）

## プロジェクト構成

```
meal-planner-app/
├── App.tsx                      ← メインアプリ（全コンポーネント含む）
├── index.ts                     ← エントリポイント (registerRootComponent)
├── src/
│   ├── types/index.ts           ← 共通型定義
│   ├── api/index.ts             ← API関数（差し替えポイント）
│   ├── config/coopConfig.ts     ← APIトークン・URL管理 (SecureStore)
│   ├── data/sampleData.ts       ← サンプル・ダミーデータ
│   └── utils/helpers.ts         ← ユーティリティ関数
├── docs/
│   ├── API_SPEC.md              ← COOP連携API仕様書
│   └── MOCK_IMPLEMENTATIONS.md ← 仮実装一覧
└── package.json
```

## API構成

実際のURL・トークンは `.env` で管理（`.env.example` 参照）。

| 機能 | エンドポイント | 認証 |
|------|--------------|------|
| WEB検索 | $EXPO_PUBLIC_WEB_API_URL/api/recipes/search (POST) | 不要 |
| COOP食材取得 | $EXPO_PUBLIC_COOP_API_URL/api/coop/ingredients (GET) | Bearer トークン |
| COOPレシピ提案 | $EXPO_PUBLIC_COOP_API_URL/api/coop/suggest-recipes (POST) | Bearer トークン |
| COOP献立自動作成 | $EXPO_PUBLIC_COOP_API_URL/api/coop/meal-plan (POST) | Bearer トークン |

- APIトークン・URLはすべて `src/config/coopConfig.ts` 経由で SecureStore から取得する
- API関数はすべて `src/api/index.ts` に集約されている
- 詳細は `docs/API_SPEC.md` および `docs/MOCK_IMPLEMENTATIONS.md` を参照

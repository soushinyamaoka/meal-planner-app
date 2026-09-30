# アプリ開発ルール

このファイルはアプリの共通開発ルール。対話時の確認手順は `CLAUDE.md` も参照する。

## 技術構成

- React Native / Expo（SDK 57）、TypeScriptを使用する。
- ログインにFirebase Auth、世帯・献立・レシピの保存にFirestoreを使用する。`src/hooks/` に同期処理、`src/screens/` と `src/components/` に一部の画面・UIを分けている。
- 献立・レシピ等のFirestoreデータにはAsyncStorageのローカルキャッシュもある。キャッシュを正本として扱わない。
- COOP等のAPI通信は主に `src/api/index.ts`、お知らせ取得は `src/api/notices.ts` に置く。COOPのURL・トークンは環境変数を初期値とし、`src/config/coopConfig.ts` 経由でSecureStoreへ保存・取得する。
- 共通型、データ、ユーティリティはそれぞれ `src/types/index.ts`、`src/data/sampleData.ts`、`src/utils/helpers.ts` を確認する。
- API仕様と実装・サンプルデータの現状は `docs/API_SPEC.md`、`docs/MOCK_IMPLEMENTATIONS.md` を参照する。

## UI変更

- 画面や操作を変えるときは、実装前に画面構成とユーザー操作の流れ、影響する画面・コンポーネントを整理する。
- レシピ入力フォームには `RecipeFormFull`（レシピタブ）と `RecipeFormInline`（献立タブの手入力）がある。フォームのUIや動作を変更するときは両方を調査し、依頼の適用範囲に合わせて整合させる。
- 画面に影響する仕様が依頼から決められない場合は、実装前に確認する。

## Firestore書き込み

Firestoreは `undefined` を含むフィールドを書き込めない。

- オブジェクトリテラルに `undefined` を入れない。省略可能フィールドは条件に応じてプロパティ自体を含めない。
- 省略可能フィールドを含むデータは、`setDoc` / `updateDoc` の前に `src/hooks/useFirestore.tsx` の `stripUndefined` を通す。
- Firestoreへの書き込みを変更したら、省略可能フィールドの生成・更新経路を確認する。

```ts
setDoc(ref, stripUndefined(data));
```

## API設定

- 実環境のURLやトークンをソースに直書きしない。`.env` の値やSecureStore内の秘密情報をログ・回答に出さない。
- API関数は既存の `src/api/index.ts` と設定管理に沿って追加・変更する。

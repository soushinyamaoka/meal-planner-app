# AI献立提案ファイルの仕様（schemaVersion 1）

ローカルPCで Codex が作った献立提案を、献立ノートに渡すためのファイル形式と受け渡し方法。Codex（生成する側）は、この文書のとおりにファイルを置くだけでよい。Firestore には接続しない。

- 機械向けの定義: `docs/meal-proposal.schema.json`（JSON Schema 2020-12）
- 見本: `docs/meal-proposal.sample.json`
- 形式チェックの実装: `scripts/mealProposalFormat.mjs`（取り込み時に使う。スキーマで表せない決まりも見る）

## 受け渡しの流れ

1. Codex が提案ファイルを受け取りフォルダに置く。
2. 取り込みスクリプト `scripts/importMealProposal.mjs` を、タスクスケジューラから定期実行する。形式をチェックして、Firestore の `households/{世帯}/mealProposals/{proposalId}` に書き込む。
3. アプリで提案を見て、採用する料理と日付を選び、献立に反映する。

Firestore のログイン情報（`.env`）は取り込みスクリプトだけが使う。Codex には渡さない。

## 置き場所とファイル名

| 項目 | 決まり |
|---|---|
| 受け取りフォルダ | `C:\work\PRG\HomeTools\meal-planner\data\meal-proposals\inbox\`（どの git リポジトリにも入っていない。環境変数 `MEAL_PROPOSAL_DIR` で親フォルダを変えられる） |
| ファイル名 | `<proposalId>.json`（例: `2026-10-30.json`） |
| 文字コード | UTF-8（BOMなし） |
| 書き方 | `<proposalId>.json.tmp` に書き終えてから `.json` に名前を変える（書きかけを取り込ませない） |

取り込み後、ファイルは次のフォルダへ移る（どちらも受け取りフォルダと同じ親フォルダの下）。ファイル名の後ろに取り込み日時が付く。

- `imported\`: 取り込めたもの。
- `rejected\`: 取り込めなかったもの。理由は同じ名前の `.error.txt` に書く。

通信などで書き込めなかったときは、`inbox\` に残して次回に再試行する。

## ファイルの中身

```json
{
  "schemaVersion": 1,
  "proposalId": "2026-10-30",
  "periodStart": "2026-10-30",
  "periodEnd": "2026-11-05",
  "createdAt": "2026-10-28T21:00:00+09:00",
  "generator": "codex",
  "basedOn": { "coopOrderDate": "2026-10-30" },
  "comment": "鮭と白菜が多めなので、前半で使い切る構成にしました",
  "days": [
    {
      "date": "2026-10-30",
      "dishes": [
        {
          "id": "d1",
          "name": "鮭のちゃんちゃん焼き",
          "role": "main",
          "ingredients": ["生鮭 2切れ", "キャベツ 1/4個", "味噌 大さじ2"],
          "steps": ["キャベツをざく切りにする", "フライパンに野菜を敷き、鮭をのせて味噌をかける"],
          "coopItems": ["生鮭", "キャベツ"],
          "note": "15分"
        }
      ]
    }
  ]
}
```

| 項目 | 必須 | 決まり |
|---|---|---|
| `schemaVersion` | ○ | `1` |
| `proposalId` | ○ | `periodStart` と同じ日付 |
| `periodStart` / `periodEnd` | ○ | 実在する日付（`YYYY-MM-DD`）。期間は1〜14日 |
| `createdAt` | ○ | `YYYY-MM-DDTHH:mm:ss+09:00`（日本時間） |
| `generator` | ○ | `"codex"` |
| `basedOn.coopOrderDate` | 任意 | 元にしたCOOP注文の配達日（`YYYY-MM-DD`） |
| `comment` | 任意 | 提案全体へのひとこと。200字以内 |
| `days` | ○ | 1日以上。料理のない日は書かない |
| `days[].date` | ○ | 期間内の日付。同じ日付を2回書かない |
| `days[].dishes` | ○ | 1日に1〜10品 |
| `dishes[].id` | ○ | ファイル内で重複しない文字列。40字以内 |
| `dishes[].name` | ○ | 料理名だけ。40字以内。「｜」「\|」を含めない（サイト名などを付けない） |
| `dishes[].role` | ○ | `main`（主菜）/ `side`（副菜）/ `soup`（汁物）/ `other`（その他） |
| `dishes[].ingredients` | ○ | 1要素に1材料、分量も書く。1〜40件、各100字以内 |
| `dishes[].steps` | ○ | 1要素に1手順、番号は付けない。1〜30件、各300字以内 |
| `dishes[].coopItems` | 任意 | 使うCOOPの食材名。0〜20件、各60字以内 |
| `dishes[].note` | 任意 | 調理時間などのひとこと。50字以内 |

共通の決まり:

- 文字列は空にせず、前後に空白を付けない。
- 値のない任意項目は `null` にせず、項目ごと省く。
- 表にない項目は書かない（あると取り込まない）。
- 料理は全部で100品以内。
- 1か所でも決まりに合わなければ、ファイル全体を取り込まない（一部だけ取り込むことはしない）。

## 同じ期間の提案を作り直したとき

`proposalId` が同じファイルは、前の提案を置き換える。ただし、アプリで1品でも採用されていれば置き換えず、`rejected\` に移す（採用の記録を消さないため）。

## Codex 側で決めること

何日分・1日何品・家族の条件（人数、苦手な食べ物など）・給食との重複を避けるかは、Codex への指示で決める。アプリ側は、上の決まりに合っていれば日数や品数を問わず取り込む。

## 取り込みスクリプトの使い方

```
# 受け取りフォルダの全ファイルをチェックだけする（書き込み・移動しない）
node --env-file=.env scripts/importMealProposal.mjs --dry-run

# 受け取りフォルダの全ファイルを取り込む（タスクスケジューラからはこれを実行）
node --env-file=.env scripts/importMealProposal.mjs

# ファイルを指定してチェックする
node scripts/importMealProposal.mjs docs/meal-proposal.sample.json --dry-run
```

終了コードは、全部取り込めたとき（または取り込むものが無いとき）に0、不合格や書き込み失敗が1件でもあれば1。

## アプリ側に追加される状態（参考）

取り込み時に、ファイルの中身に次の項目を足して Firestore に書く。Codex のファイルには書かない。

- `status`: `"new"`（アプリで見た・閉じたなどに応じて変わる）
- `adoptions`: `{}`（どの料理をどの日に採用したかを、アプリが記録する）
- `importedAt`: 取り込んだ日時

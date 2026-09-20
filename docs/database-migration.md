# Firestore → D1 / Workers の段階移行

`DATABASE_MIGRATION_STAGE` を環境ごとに設定して、全10コレクションの読み書き先を切り替える。
未設定時は `firestore-only`。空文字・スペルミスはエラーにし、別のDBへ暗黙に切り替えない。

| 設定値              | 読み取り・主書き込み | ミラー書き込み | 実行環境                 |
| ------------------- | -------------------- | -------------- | ------------------------ |
| `firestore-only`    | Firestore            | なし           | Cloud Run / Node.js      |
| `firestore-primary` | Firestore            | D1             | Cloud Run / Node.js      |
| `d1-primary`        | D1                   | Firestore      | Cloud Run / Node.js      |
| `d1-only`           | D1                   | なし           | Cloud Run または Workers |

**Firestoreを使う段階はCloud Runで運用し、Workersへの切り替えは `d1-only` で行う。**
Firebase Admin SDKは現在のWorkersランタイムで動作しない。Worker上で他の段階を指定すると、
書き込み前にエラーにする。`wrangler.jsonc` の段階設定は、この最終段階を指定している。
通常の `pnpm dev` / `pnpm build` はCloudflareの設定・認証・リソースを必要としない。

## 対象と実装境界

- `members`, `blogs`, `news`, `weeks`, `line_invitations`, `optout_submissions`,
  `survey_optout`, `surveys`, `events`, `system` をすべて対象とする。
- 既存の `lib/firebase.ts` は互換exportとなり、`lib/database/` が全機能の読み書きを制御する。
  新規のDBアクセスもこの入口を通す。Firebase Adminへ直接書く処理を追加しない。
- D1はコレクションごとのテーブルと、現在の検索条件に対応する列・indexを持つ。
  既存データの未知フィールド、未設定と `null` の違い、時刻精度も保持する。
- Mini LTの発表配列は、現在の週単位トランザクションを維持するためJSON列に保存する。
  サブアカウント連携など複数レコードの更新も、主DB内では原子的に確定する。
- PR #306のRFC全体を一度に適用するものではない。R2への画像移行、CronのQueue分割、
  Terraform stateの移動、Google Cloudリソースの削除は含めない。画像は引き続きGCSを使う。

## 書き込みと障害時の動作

二重書き込み時は、主DBの更新とoutboxへの記録を同じトランザクションで確定し、
その後ミラーDBへの反映を待つ。ミラーには確定済みのID・時刻・データを渡すため、
業務処理やDiscord/LINE通知をもう一度実行することはない。

- 主DBの確定失敗: 全更新を取り消し、要求を失敗させる。ミラーは変更しない。
- ミラー失敗: 主DBの成功は保持し、要求は成功扱い。`database_mirror_pending` を記録し、
  outboxを残す。ログにはイベントIDとDB名だけを出し、会員データやトークンを出さない。
- 再送: `pnpm db:replay` または認証済みの `/api/cron/database-migration` がoutboxを処理する。
  Terraformでは二重書き込み段階だけ、毎分のCloud Schedulerジョブを作成する。
  失敗時はoutboxを保持し、cronは503を返す。継続的な503や `pending: true` を監視する。
- 順序: 各レコードの更新番号を保存し、ミラーは新しい番号だけ反映する。
  再送・コピーの順序が逆転しても古い値で上書きしない。削除後にも番号を残すので復活しない。
- 時刻: `serverTimestamp()` は主書き込みの開始時刻を共通値として確定する。
  Firestoreに合わせてマイクロ秒精度にそろえ、両DBに同じ値を書く。

DB間で同時に確定する分散トランザクションではない。ミラー障害中には一時的な差分があり、
**outboxが空で、書き込み停止中の照合が一致すること**を切り替え条件とする。
outboxや削除マーカーを手動削除しない。失敗を無視して次の段階へ進めない。

## 設定

Cloud Run / CLIからD1に接続する場合は次をサーバー環境変数に設定する。

```dotenv
DATABASE_MIGRATION_STAGE=firestore-only
DATABASE_WRITES_PAUSED=false
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_D1_DATABASE_ID=your-database-id
CLOUDFLARE_API_TOKEN=your-scoped-d1-token
```

`firestore-only` ではCloudflareの3変数は不要。`d1-only` ではDB用途のFirebase設定は不要。
Workersでは `DB` bindingを使うため、D1アクセス用APIトークンをWorkerへ渡す必要はない。
混在期間のHTTP接続はCloudflare APIの制限を受けるため、切替前に想定負荷で確認する。

Terraformは `database_migration` で環境ごとの設定を受け付ける。省略した環境はFirestore単独になる。
APIトークンは既存のSecret Manager secretに格納し、その名前だけを渡す。

```hcl
database_migration = {
  dev = {
    stage              = "firestore-primary"
    account_id         = "your-account-id"
    database_id        = "your-dev-database-id"
    api_token_secret_id = "cloudflare-d1-token-dev"
  }
}

# 切替作業中だけ指定。空集合に戻すと書き込みを再開する。
database_migration_writes_paused = ["dev"]
```

`DATABASE_WRITES_PAUSED=true` の間は、アプリの全DB書き込みがエラーになる。
読み取り、移行CLI、outbox再送は引き続き利用できる。メンテナンス時間として扱い、
DB更新より先に外部APIを呼ぶ機能もあるため、ユーザー操作と通常のcron/webhook流入も停止する。
全インスタンスに反映し、古いリビジョンの要求とバックグラウンドジョブが終了したことを確認する。
CLIの `--writes-paused` はその確認を表し、リモートアプリの停止を自動実行するものではない。

## 環境ごとの実施手順

Dev → Staging → Productionの順に、各環境専用のDB・認証情報で実施する。
PR previewをDev/Staging/ProductionのD1に接続しない。

1. この実装を `firestore-only` でCloud Runへデプロイする。旧実装へ直接書き込む
   リビジョンが残っていないことを確認する。Firestoreのバックアップも取得する。
2. 環境専用D1を用意し、`wrangler.jsonc` の該当環境のプレースホルダーIDを置き換える。
   `pnpm exec wrangler d1 migrations apply DB --remote --env dev` でスキーマを作成する。
   `dev` は対象に応じて `stg` / `prd` に変える。
3. 全書き込みを停止する。`DATABASE_WRITES_PAUSED=true` を全インスタンスへ反映し、
   旧要求の終了を待つ。Firestoreからのコピー完了後も、二重書き込みが有効になるまで停止を維持する。
4. 下記のコピーと照合を実行する。環境別の `.env.migration.dev` にFirestoreとD1双方の設定を保存する。
   ファイルには対象環境の `FIREBASE_PROJECT_ID`, `FIRESTORE_DATABASE_ID` も明示する。

   ```bash
   pnpm db:copy --env-file .env.migration.dev --writes-paused
   pnpm db:verify --env-file .env.migration.dev --writes-paused
   ```

5. `firestore-primary` を全インスタンスへ反映してから書き込みを再開する。
   Firestoreで読み取り、すべての変更をD1へミラーする。cron再送とoutboxの滞留を監視する。
6. D1を主DBにする直前に再び全書き込みを停止し、残った要求を終了させる。
   CLI側の段階設定も現行環境と同じにして、以下を実行する。

   ```bash
   pnpm db:replay --env-file .env.migration.dev
   pnpm db:verify --env-file .env.migration.dev --writes-paused
   ```

   `matches: true`、両方の `pending: false` を確認し、`d1-primary` を全インスタンスへ反映する。
   旧段階のリビジョンが終了してから書き込みを再開する。D1の読み取りを運用で確認する。

7. 安定確認後、同じ停止 → 再送 → 照合を行い、`d1-only` へ切り替える。
   この段階ではFirestoreへの読み取りも書き込みも行わない。
8. `d1-only` を維持してWorkersへ実行基盤を移す。Cloud RunとWorkersを同じD1へ接続し、
   認証・アップロードを含む確認後にトラフィックを切り替える。

### CLIの性質

- `copy`: 全対象コレクションをページングし、同じIDでupsertする。再実行可能。
  未対応のコレクション・サブコレクションが見つかった場合はコピー前に停止する。
  途中失敗時は先頭から再実行でき、既に反映済みの同一/古い更新番号は無視する。
- コピー中も書き込みを続ける必要がある場合は、先に `firestore-primary` を全インスタンスへ反映して
  outboxを有効にしてからコピーする。この場合のみ `--writes-paused` なしで実行できる。
  コピーだけで主DBへ切り替えず、最後は停止中の再送・照合を行う。
- `verify`: 全主キー・全データ・更新番号・削除マーカーを比較し、コレクションごとの件数と
  SHA-256 checksumを出力する。内容の差分または未配信outboxがあれば終了コード1。
  会員情報の本文は出力しない。単一環境のデータをメモリ上で比較するため、大規模化時は実行メモリを確保する。
- `replay`: 1回につき最大10,000イベントを再送する。残件があれば終了コード1なので再実行する。
  永続的な失敗は原因を修正してから再実行する。件数だけ一致していても切替可とは判定しない。
- CLIは標準で `.env.local` を読み込む。リモート作業は `--env-file` を明示する。
  リモートD1の選択はそのファイル内のIDで行い、Wranglerの `--env` とは独立している。
- 更新番号が同じなのに値が違う場合、コピーは自動修復しない。旧リビジョンやSDK直接書き込みを調査し、
  主DB側のアプリ経由で訂正して新しい更新番号を発行する。照合が一致するまでは切り替えない。

## ロールバック

- `firestore-primary` → `firestore-only`: 書き込み停止・再送・照合後に戻す。
  D1に未配信の変更を残す場合は、次の移行前に必ず再送と再照合が必要。
- `d1-primary` → `firestore-primary`: 停止中にD1側outboxをすべてFirestoreへ配信し、照合してから戻す。
  D1とFirestoreを同時に別の主DBとして書き込ませない。
- `d1-only` からFirestoreへ戻す場合: Firestoreは最新とは限らないのでフラグだけ戻さない。
  全書き込みを停止し、`d1-only` を指定したCLI環境で逆コピーする。

  ```bash
  pnpm db:copy --from d1 --env-file .env.migration.dev --writes-paused
  pnpm db:replay --from d1 --env-file .env.migration.dev --writes-paused
  pnpm db:verify --from d1 --env-file .env.migration.dev --writes-paused
  ```

  一致した後にCloud Run側の段階を変更する。WorkersではFirestore段階へ戻せない。

## ローカル検証とWorkersへのデプロイ

```bash
just emulator
pnpm db:migrate:local --env dev
# Firestore emulatorとローカルD1だけを使用。アプリは書き込み停止中にする。
DATABASE_MIGRATION_STAGE=firestore-only pnpm db:copy --local --env dev --writes-paused
DATABASE_MIGRATION_STAGE=firestore-only pnpm db:verify --local --env dev --writes-paused
DATABASE_MIGRATION_STAGE=d1-only NEXT_DEV_WRANGLER_ENV=dev pnpm dev:cloudflare
```

`--local` は `FIRESTORE_EMULATOR_HOST` 必須。実Firestoreからローカルへ誤ってコピーしない。
ローカルCLIの `--env dev` と、開発サーバーの `NEXT_DEV_WRANGLER_ENV=dev` は同じDBを選ぶ。
省略時は両方ともWranglerのトップレベルDBを使う。

```bash
pnpm build:cloudflare
pnpm preview:cloudflare --env dev
# リソース・変数・secretsを設定し、切替条件を確認した後に実行
pnpm deploy:cloudflare --env dev
```

WorkersにもAuth.js、Discord、LINE、cron等の既存環境変数・secretsを環境別に設定する。
`NEXT_PUBLIC_APP_ENV` はビルド時、`AUTH_URL` は実際の環境URLを指定する。
GCSを継続利用するため、Workersには `GCS_CLIENT_EMAIL` / `GCS_PRIVATE_KEY` / `GCS_BUCKET_NAME` を設定する。
Cloud RunのADCはWorkersでは使えない。OAuthのredirect URL、画像アップロード、外部通知は
各環境の認証情報を使って切り替え前に確認する。既存Cloud SchedulerのURLも到達先に合わせる。

OpenNextの共有キャッシュはこの構成では無効。`unstable_cache` によるリクエスト間キャッシュを
必要とする場合は別途キャッシュbindingを導入する。この変更はリモートの作成・デプロイ・データ移行を自動実行しない。

参考: [PR #306](https://github.com/Lumos-Programming/lumos-web/pull/306)、
[OpenNext](https://opennext.js.org/cloudflare)、
[D1 batchの原子性](https://developers.cloudflare.com/d1/worker-api/d1-database/)、
[D1 HTTP API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/)。

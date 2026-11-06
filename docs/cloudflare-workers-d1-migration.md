# Cloudflare Workers + D1 移行計画

Lumos Web の実行基盤を Google Cloud Run から Cloudflare Workers へ、永続データを
Cloud Firestore から Cloudflare D1 へ段階的に移行するための計画を定義する。
既存環境を先に削除する一括切り替えは行わず、Cloud Run / Firestore をロールバック先として
維持したまま、環境単位で検証と切り替えを進める。

## ステータス

- Draft
- この文書は移行の境界、順序、完了条件を合意するためのもの
- Cloudflare アカウント固有の ID、API トークン、D1 データベースはまだ作成しない
- Cloud Run、Firestore、GCS、Cloud Scheduler の既存リソースはまだ変更・削除しない

## 目標

- Next.js アプリケーションを Cloudflare Workers 上で実行する
- `dev`、`stg`、`prd` ごとに独立した Worker と D1 データベースを持つ
- Firestore の既存データと振る舞いを D1 の明示的なスキーマへ移す
- プロフィール画像を GCS から Workers で利用できるオブジェクトストレージへ移す
- Cloud Scheduler の定期実行を Workers Cron Triggers へ移す
- GitHub Environments を利用し、Staging / Production のデプロイを明示承認の対象にする
- 検証可能なデータ移行、段階的な切り替え、合意した期間内のロールバックを可能にする

## 対象外

- UI や機能仕様の変更
- 移行と無関係な Firestore データの整理
- Cloud Run / Firestore の即時削除
- Cloudflare アカウント情報やシークレットのリポジトリへの保存

## ランタイム方針

最初の Workers 対応には OpenNext Cloudflare adapter を使用する。

Cloudflare が現在推奨する vinext の互換性チェックを 2026-09-13 に実行した結果、
このリポジトリは 87% compatible だったが、認証の中心である `next-auth` が非対応として
検出された。OpenNext は既存の Next.js App Router、Route Handlers、Server Actions を維持して
Workers へ移すための暫定経路とし、vinext への変更は認証互換性が確認できた時点で別途判断する。

Workers 設定では次を必須とする。

- `nodejs_compat` compatibility flag
- 日付を固定した `compatibility_date`
- `.open-next/worker.js` を Worker entrypoint とする `wrangler.jsonc`
- `.open-next/assets` の static assets binding
- `DB` という名前の D1 binding
- `dev`、`stg`、`prd` の named environment

アプリケーションから D1 を取得するときは、OpenNext の
`getCloudflareContext().env.DB` をリクエスト内で使用する。Worker のリクエストをまたいで
データベースクライアントを共有しない。

## 現在の依存関係と移行先

| 現在                       | 移行先                        | 注意点                                                            |
| -------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| Cloud Run                  | Cloudflare Workers + OpenNext | Node.js 固有 API と Worker bundle size を検証する                 |
| Firestore                  | D1                            | Document API を直接置換せず、ドメインごとの repository を経由する |
| Firebase Admin SDK         | D1 binding                    | `Timestamp` と `FieldValue` を標準型と SQL に置き換える           |
| GCS                        | Cloudflare R2                 | 公開 URL、CORS、既存画像 URL の移行が必要                         |
| Cloud Scheduler            | Workers Cron Triggers         | `refresh-avatars` の認証方式と 24 時間 cooldown を維持する        |
| Secret Manager             | Workers secrets               | 環境ごとに `wrangler secret put` または CI から設定する           |
| Artifact Registry / Docker | Worker bundle                 | Docker build と image push を廃止する                             |
| Cloud Run PR service       | Workers preview deployment    | PR ごとに本番データへ接続しない分離方針が必要                     |

## D1 データモデル

Firestore document を 1 個の JSON 列へコピーするだけの互換テーブルは採用しない。
現在の検索条件、一意性、トランザクション境界を SQL schema と index で表現する。
複合値のうち検索対象でない設定値だけを JSON text として保存する。

| Firestore collection    | D1 table                                       | 主なキー / index                                                |
| ----------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| `members`               | `members`                                      | `discord_id` PK、`line_id` UNIQUE、公開・退会・登録状態の index |
| `members` の SNS / 履歴 | `member_social_accounts`、`member_enrollments` | member FK、provider / fiscal year                               |
| `blogs`                 | `blogs`                                        | `id` PK、`author_id`、`published_at DESC`                       |
| `line_invitations`      | `line_invitations`                             | `code` PK、`line_id`、`user_id`、`used`、`expires_at`           |
| `optout_submissions`    | `optout_submissions`                           | `discord_id` + `kind` UNIQUE                                    |
| `survey_optout`         | `optout_surveys`                               | `discord_id` PK、`confirmed_at`                                 |
| `surveys`               | `surveys`                                      | 用途を確認し、既存 API の読み書き条件に合わせる                 |
| `weeks`                 | `mini_lt_weeks`、`mini_lt_talks`               | `week_id`、talk の順序、presenter の週内 UNIQUE                 |
| `events`                | `events`                                       | 現在の read model を確認して index を決める                     |
| `system/avatarRefresh`  | `scheduled_jobs`                               | `job_name` PK、開始・完了時刻、実行状態                         |

時刻は Unix milliseconds の `INTEGER` として統一する。boolean は `INTEGER NOT NULL`
と `CHECK (value IN (0, 1))` で表現する。配列の並べ替えや同時更新を行う Mini LT は、
週レコード内の配列ではなく talk table と transaction で表現する。

## アプリケーションの移行境界

Firestore API が各機能へ直接露出しているため、先に repository interface を導入する。
切り替え単位は次の順序とする。

1. Blogs（CRUD と query が小さく、公開表示まで end-to-end で検証できる）
2. LINE invitations（有効期限、一意性、使用済み更新を検証できる）
3. Opt-out / surveys（冪等性と複数書き込みを検証する）
4. Mini LT（transaction、順序、一人一件制約を検証する）
5. Members / sub-account / onboarding（認証と全機能が依存するため最後に切り替える）

各 repository は Firestore 実装と D1 実装で同じ契約テストを通す。Route Handler、Server
Action、React component から SDK 固有型を参照しない。`FirebaseFirestore.Timestamp` は
repository の外へ返さず `Date` または Unix milliseconds に変換する。

## データ移行

環境ごとに次の手順を実行する。

1. Firestore export を取得し、件数と checksum を記録する
2. export を正規化した NDJSON / CSV に変換する再実行可能な変換スクリプトを用意する
3. D1 migration を適用する
4. transaction 単位で D1 へ import する
5. table 件数、主キー、必須項目、サンプルレコードを照合する
6. Firestore read + D1 shadow write を有効にし、書き込み結果を比較する
7. D1 read / primary write へ切り替え、Firestore mirror write を短期間継続する
8. 安定期間後に Firestore write を停止する

変換スクリプトは入力を変更せず、同じ export に対して同じ出力を生成する。失敗後の再実行で
重複を作らないよう、すべての import を primary key による upsert とする。

### Source of truth と dual write

| Stage   | Read      | Primary write | Mirror                  | ロールバック条件                                             |
| ------- | --------- | ------------- | ----------------------- | ------------------------------------------------------------ |
| Import  | Firestore | Firestore     | なし（snapshot import） | 常に Firestore へ戻せる                                      |
| Shadow  | Firestore | Firestore     | D1 へ非同期反映         | 未反映 queue を破棄して戻せる                                |
| Cutover | D1        | D1            | Firestore へ非同期反映  | mirror queue を drain し、件数と checksum を照合してから戻す |
| D1 only | D1        | D1            | なし                    | write freeze と D1 → Firestore 逆移行が必要                  |

primary write が失敗した場合は request を失敗させ、mirror event は作らない。primary write が成功し
mirror write だけが失敗した場合は、idempotency key を持つ migration queue で再試行し、dead-letter
を監視する。切り替え中に同期対象から漏れたデータは定期 reconciliation job が主キーと更新時刻を
比較して補正する。Stage の変更は環境ごとに feature flag で行い、rollback 可否と必要手順を
runbook に記録する。

## 定期アバター更新

現在の `/api/cron/refresh-avatars` は全対象メンバーを読み、LINE / Discord API を逐次呼び出し、
Discord 呼び出し間に待機する。この処理全体を一つの Cron Trigger handler 内で実行しない。

1. Cron Trigger の scheduled entrypoint が `scheduled_jobs` の `avatar-refresh` 行を条件付き更新し、
   24 時間 cooldown と多重起動防止を一つの SQL statement で確保する
2. 対象メンバーをページングし、provider と member ID を持つ task を Cloudflare Queue へ送る
3. Queue consumer が小さい batch で外部 API を呼び、成功した avatar だけを D1 へ反映する
4. Discord / LINE の rate-limit response を尊重し、遅延 retry と最大試行回数を設定する
5. task は run ID + provider + member ID を idempotency key とし、再配信で二重更新しない
6. 全 task の完了後に `scheduled_jobs.last_completed_at` と集計結果を更新する

実装時に Worker の CPU time、wall time、subrequest、Queue batch の各 limit に対する負荷試験を行い、
最大会員数で一回の consumer が上限内に収まる batch size を決める。dead-letter queue と失敗件数の
alert を用意し、部分失敗を次回の 24 時間実行まで放置しない。

## 環境とデプロイ

| GitHub Environment | Worker environment | D1       | デプロイトリガー          |
| ------------------ | ------------------ | -------- | ------------------------- |
| Development        | `dev`              | Dev 専用 | `main` push               |
| Staging            | `stg`              | Stg 専用 | `v*.*.*-rc.*` pre-release |
| Production         | `prd`              | Prd 専用 | stable `v*.*.*` release   |

Staging と Production の job には GitHub Environment を指定し、repository settings で
required reviewers を設定する。PR preview は共有する Dev / Stg / Prd D1 に書き込まない。
isolated local D1 で build / integration test を行い、remote preview が必要な場合は PR ごとの
DB 作成・migration・削除を一つの lifecycle として実装する。

Cloudflare の外部 CI/CD は `CLOUDFLARE_ACCOUNT_ID` と、最小権限に限定した
`CLOUDFLARE_API_TOKEN` を必要とする。GitHub Actions の `GITHUB_TOKEN` だけでは Worker を
デプロイできない。値は GitHub Environment secrets に保存し、ソースや PR log へ出さない。

## IaC と Terraform state

永続する Cloudflare resource（D1、R2、Queue、custom domain route）は Cloudflare Terraform
provider で管理し、Wrangler は OpenNext の build、Worker version の deploy、binding の参照に
限定する。環境ごとの resource ID は Terraform output から `wrangler.jsonc` へ反映し、同じ
resource を Terraform と Wrangler の両方で作成しない。PR preview の一時 resource だけは、
lifecycle を一つの workflow 内に閉じる。

現在の Terraform state は `lumos-infra-terraform-state` GCS bucket にある。Google Cloud を廃止する
前に専用 R2 bucket の S3-compatible backend へ `terraform init -migrate-state` で移し、移行前の
state backup、移行後の `terraform state pull`、plan 差分なしを確認する。state 用 R2 credential は
GitHub Environment secret とし、アプリケーション用 credential と分離する。

既存の Google IAM、Workload Identity Federation、Artifact Registry、Cloud Run service account、
Secret Manager、Cloud Scheduler、Firestore、GCS は Production cutover 完了まで Terraform state
から外さない。廃止は resource ごとの backup / retention / `prevent_destroy` 解除を確認する別 PR で
行い、Terraform state bucket は state 移行の検証完了後に最後に削除する。

## 段階的な実装

- [ ] Phase 1: OpenNext / Wrangler の build と local preview を追加する
- [ ] Phase 2: Cloudflare Terraform resources と state backend 移行を定義する
- [ ] Phase 3: `dev` / `stg` / `prd` の Worker、D1、R2、Queue binding を定義する
- [ ] Phase 4: D1 schema、migration、repository contract tests を追加する
- [ ] Phase 5: Blogs から順に各 repository を D1 へ移行する
- [ ] Phase 6: Firestore export converter と D1 importer を追加する
- [ ] Phase 7: GCS の画像を R2 へ移し、URL と upload API を切り替える
- [ ] Phase 8: Avatar refresh を Cron Trigger + Queue consumer へ移す
- [ ] Phase 9: Workers 用 CI/CD と GitHub Environment approval を追加する
- [ ] Phase 10: Dev、Stg、Prd の順に shadow / read cutover を実施する
- [ ] Phase 11: 安定期間とバックアップ確認後、Google Cloud resources を別 PR で廃止する

## 完了条件

- OpenNext production build と Workers local preview が成功する
- Firebase Admin SDK と `@google-cloud/storage` が production bundle から削除されている
- D1 migration を空 DB と既存 snapshot の両方へ適用できる
- Firestore と D1 の契約テストが同一の期待値を満たす
- 全 collection / table の件数と必須データが環境ごとに照合済み
- OAuth、onboarding、profile、blog、LINE、opt-out、Mini LT、cron の smoke test が成功する
- Avatar refresh の最大想定件数が Workers / Queue limits 内で完了し、失敗 task を再実行できる
- Terraform state が GCS 以外の backend へ移行され、移行後の plan に意図しない差分がない
- Dev と Stg で rollback drill が成功する
- Production 切り替え後も Firestore backup を合意した期間保持する
- Cloud Run / Firestore の削除は移行 PR と分け、明示承認を得る

## ロールバック

Shadow stage では Workers の custom domain route と read flag を Cloud Run / Firestore 側へ戻す。
Cutover stage では Firestore mirror queue を drain し、reconciliation が成功してから route と read
flag を戻す。D1-only stage では即時に戻せないため、write freeze、D1 export、Firestore への
逆変換、件数と checksum の照合を完了してから route を戻す。

## 未決事項

- Cloudflare account / zone と各環境の管理主体
- D1 の backup、Point-in-Time Recovery、保持期間の運用要件
- R2 bucket の公開方法と既存 GCS URL の redirect 期間
- PR preview ごとに D1 を作成するか、local integration test のみにするか
- OpenNext 上で Auth.js v5 の全 OAuth callback / cookie flow が動くか
- Production data の移行時間と write freeze の許容時間
- Workers limits に対する bundle size、CPU time、request body size の実測値

## 参考資料

- [Cloudflare Workers: OpenNext adapter](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)
- [OpenNext: Cloudflare bindings](https://opennext.js.org/cloudflare/bindings)
- [Cloudflare D1: Environments](https://developers.cloudflare.com/d1/configuration/environments/)
- [Cloudflare D1: Migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Cloudflare Workers: GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)

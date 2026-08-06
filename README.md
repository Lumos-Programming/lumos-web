# Lumos Web

横浜国立大学のプログラミングサークル「Lumos」の公式サイトおよびメンバー向けプラットフォームです。
公開サイト（ニュース・メンバー紹介・お問い合わせ）に加え、Discord 認証によるメンバー限定エリア、週次 Lightning Talk イベント「Mini LT」の管理機能などを備えています。

> Official website and member platform for "Lumos", a programming circle at Yokohama National University, Japan.
>
> At its core, this is a platform for the circle's members and organizers. Members maintain rich profiles — name/nickname, department, academic year, membership type (undergraduate / graduate / alumni), interests, bio, avatar images, and linked social accounts (GitHub, X, LINE, Discord) — and share them within the circle, with per-field visibility controls and avatar selection. For the operations side, it provides admin tooling for detailed member management: a member dashboard, role assignment based on Discord guild roles, notifications, and an onboarding flow for newly joined members.
>
> Authentication is built on Discord OAuth (NextAuth.js v5), matching how the circle actually communicates day to day. The site also serves the public pages (news, member directory, contact) and a management system for "Mini LT", the circle's weekly lightning-talk event — including automated Discord event creation via a bot and LINE push notifications (Flex Messages).

## 機能 / Features

- **公開サイト**: ランディングページ、ニュース、メンバー一覧、お問い合わせ
  - Public pages: landing, news, member directory, contact
- **メンバーエリア (`/internal`)**: Discord OAuth ログイン必須。プロフィール編集・画像アップロード、メンバー設定、GitHub / X / LINE アカウント連携、新規メンバーのオンボーディングフロー
  - Members-only area (`/internal`): Discord OAuth login, profile editing with image upload (GCS), account linking with GitHub / X / LINE, onboarding flow for new members
- **Mini LT 管理**: 週次 LT イベントの作成・管理、管理者パネル、Discord イベントの自動作成（Bot 経由）、LINE プッシュ通知（Flex Message）
  - Mini LT management: weekly lightning-talk event scheduling, admin panel, automated Discord event creation via bot, LINE push notifications (Flex Messages)
- **権限管理**: Discord ギルドのロールに基づく管理者判定
  - Role-based admin detection via Discord guild roles

## 技術スタック / Tech Stack

- **フレームワーク**: Next.js 16 (App Router) + React 19 + TypeScript
- **認証**: NextAuth.js v5（Discord OAuth、セカンダリ OAuth 連携: GitHub / X / LINE）
- **データベース**: Cloud Firestore（Firebase Admin SDK、ローカル開発は Firestore Emulator）
- **スタイル**: Tailwind CSS + shadcn/ui (Radix UI)
- **フォーム**: react-hook-form + zod
- **テスト**: Vitest + Firestore Emulator
- **外部連携**: Discord API（OAuth / ギルド検証 / Bot）、LINE Messaging API、Google Cloud Storage

## インフラ・CI/CD / Infrastructure

- **デプロイ**: Google Cloud Run（`output: "standalone"` ビルドを Docker イメージ化）
- **IaC**: Terraform（`infra/` — Cloud Run, Firestore, GCS, Cloud Scheduler, Service Account 等）
- **CI/CD**: GitHub Actions — dev / stg / release 環境へのデプロイ、PR ごとのプレビュー環境構築とクローズ時の自動削除、Lint チェック
- **定期実行**: Cloud Scheduler + `/api/cron` によるスケジュール処理

## ディレクトリ構成

| パス                  | 説明                                              |
| --------------------- | ------------------------------------------------- |
| `app/`                | Next.js App Router ページ                         |
| `app/mini-lt/`        | Mini LT プロジェクト（週次LTイベント管理）        |
| `app/internal/`       | サークルメンバー向け内部ページ（要認証）          |
| `app/api/`            | API ルート（プロフィール、連携、Webhook、cron等） |
| `components/`         | 共通UIコンポーネント                              |
| `components/mini-lt/` | Mini LT 専用コンポーネント                        |
| `lib/`                | サーバーサイドユーティリティ                      |
| `lib/mini-lt/`        | Mini LT 専用ロジック（Firebase, utils, actions）  |
| `infra/`              | Terraform によるインフラ定義                      |
| `types/`              | 型定義                                            |

## セットアップ

```bash
pnpm install
cp .env.example .env.local
# .env.local を編集して環境変数を設定
```

## 開発

```bash
just dev            # 開発サーバーを起動（エミュレータが未起動なら自動起動）
just test           # テスト実行
just lint           # ESLint
just format         # Prettier
just build          # プロダクションビルド
```

## Firestoreエミュレータ

ローカル開発では Firebase Firestore エミュレータを使用します。プロジェクトIDは `lumos-web` で統一されています。

```bash
just emulator       # エミュレータをバックグラウンドで起動
just emulator-stop  # エミュレータを停止
just emulator-reset # エミュレータを再起動（データをリセット）
```

- エミュレータUI: http://localhost:4000/firestore
- エミュレータのデータはインメモリのため、停止するとリセットされます
- `just dev` 実行時にエミュレータが未起動であれば自動的に起動します
- `just dev` を停止してもエミュレータは終了しません

> **注意**: グローバルインストールの `firebase` コマンド（Homebrew等）は Node.js v25 と互換性がありません。必ず `pnpm exec firebase` を使用してください（justfile は自動的にこれを使用します）。

## 環境変数

`.env.example` を参照してください。主要な変数：

| 変数                  | 説明                                   |
| --------------------- | -------------------------------------- |
| `AUTH_SECRET`         | NextAuth.js のシークレットキー         |
| `AUTH_DISCORD_ID`     | Discord OAuth クライアントID           |
| `AUTH_DISCORD_SECRET` | Discord OAuth クライアントシークレット |
| `DISCORD_BOT_TOKEN`   | Discord Bot トークン（イベント作成用） |
| `DISCORD_GUILD_ID`    | Discordサーバー（Guild）ID             |
| `FIREBASE_PROJECT_ID` | Firebase プロジェクトID                |

## 認証

Discord OAuthを使用。`/internal/*` へのアクセスは認証必須で、未認証の場合はDiscordログインへリダイレクトされます。

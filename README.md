# Lumos Web

横浜国立大学プログラミングサークル「Lumos」の公式サイト。

## 構成

| パス | 説明 |
|------|------|
| `app/` | Next.js App Router ページ |
| `app/mini-lt/` | Mini LT プロジェクト（週次LTイベント管理） |
| `app/internal/` | サークルメンバー向け内部ページ（要認証） |
| `components/` | 共通UIコンポーネント |
| `components/mini-lt/` | Mini LT 専用コンポーネント |
| `lib/` | サーバーサイドユーティリティ |
| `lib/mini-lt/` | Mini LT 専用ロジック（Firebase, utils, actions） |
| `types/` | 型定義 |

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **認証**: NextAuth.js v5 (Discord OAuth)
- **データベース**: Firestore (Firebase Admin SDK)
- **スタイル**: Tailwind CSS + shadcn/ui
- **テスト**: Vitest + Firestore Emulator

## セットアップ

```bash
pnpm install
cp .env.example .env.local
# .env.local を編集して環境変数を設定
```

## 開発

```bash
just dev       # Firestoreエミュレータ + Next.js 開発サーバーを起動
just test      # テスト実行
just lint      # ESLint
just format    # Prettier
just build     # プロダクションビルド
```

> `just dev` はFirestoreエミュレータがすでに起動している場合、Next.jsのみを起動します。

## 環境変数

`.env.example` を参照してください。主要な変数：

| 変数 | 説明 |
|------|------|
| `AUTH_SECRET` | NextAuth.js のシークレットキー |
| `AUTH_DISCORD_ID` | Discord OAuth クライアントID |
| `AUTH_DISCORD_SECRET` | Discord OAuth クライアントシークレット |
| `DISCORD_BOT_TOKEN` | Discord Bot トークン（イベント作成用） |
| `DISCORD_GUILD_ID` | Discordサーバー（Guild）ID |
| `FIREBASE_PROJECT_ID` | Firebase プロジェクトID |

## 認証

Discord OAuthを使用。`/internal/*` へのアクセスは認証必須で、未認証の場合はDiscordログインへリダイレクトされます。

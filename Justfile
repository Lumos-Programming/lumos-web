# デフォルト: 利用可能なレシピを表示
default:
    @just --list

# Firestore エミュレータ + 開発サーバーを起動
dev:
    pnpm exec firebase emulators:exec --only firestore "next dev"

# Firestore エミュレータでテストを実行
test:
    pnpm exec firebase emulators:exec --only firestore "vitest run"

# ESLint によるコード検査
lint:
    pnpm lint

# Prettier でコード整形
format:
    pnpm format

# コード整形のチェック
format-check:
    pnpm format:check

# プロダクションビルド
build:
    pnpm build

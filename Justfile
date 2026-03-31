# デフォルト: 利用可能なレシピを表示
default:
    @just --list

# Firestore エミュレータ + 開発サーバーを起動（エミュレータ未起動時のみ起動）
dev:
    #!/usr/bin/env sh
    if nc -z localhost 8080 2>/dev/null; then
        echo "Firestore emulator already running, starting Next.js only..."
        pnpm dev
    else
        pnpm exec firebase emulators:exec --only firestore "next dev"
    fi

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

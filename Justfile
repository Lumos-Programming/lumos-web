# デフォルト: 利用可能なレシピを表示
default:
    @just --list

# Firestore エミュレータをバックグラウンドで起動
emulator:
    #!/usr/bin/env sh
    if nc -z localhost 8080 2>/dev/null; then
        echo "Firestore emulator is already running."
    else
        echo "Starting Firestore emulator in background..."
        pnpm exec firebase emulators:start --only firestore --project lumos-web &
    fi

# Firestore エミュレータを停止
emulator-stop:
    #!/usr/bin/env sh
    PID=$(lsof -ti tcp:8080 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "Stopping Firestore emulator (PID: $PID)..."
        kill "$PID"
    else
        echo "No emulator running on port 8080."
    fi

# Firestore エミュレータのデータをリセット（再起動）
emulator-reset:
    #!/usr/bin/env sh
    PID=$(lsof -ti tcp:8080 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "Stopping Firestore emulator (PID: $PID)..."
        kill "$PID"
        sleep 2
    fi
    echo "Starting Firestore emulator in background..."
    pnpm exec firebase emulators:start --only firestore --project lumos-web &

# 開発サーバーを起動（エミュレータが未起動の場合は自動起動）
dev:
    #!/usr/bin/env sh
    if ! nc -z localhost 8080 2>/dev/null; then
        echo "Starting Firestore emulator in background..."
        pnpm exec firebase emulators:start --only firestore --project lumos-web &
        echo "Waiting for emulator to be ready..."
        while ! nc -z localhost 8080 2>/dev/null; do sleep 1; done
        echo "Firestore emulator is ready."
    fi
    pnpm dev

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

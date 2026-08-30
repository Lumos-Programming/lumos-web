# firebase.json からエミュレータのポート番号を取得し .env.local の値を上書きする
# エミュレータのポート番号を変更したい場合は、一時的にfirebase.jsonに変更を加える
set dotenv-load
set dotenv-path := ".env.local"
FIRESTORE_EMULATOR_PORT := shell("cat firebase.json | jq .emulators.firestore.port")
export FIRESTORE_EMULATOR_HOST := 'localhost:'+FIRESTORE_EMULATOR_PORT

# デフォルト: 利用可能なレシピを表示
default:
    @just --list

# Firestore エミュレータをバックグラウンドで起動
emulator:
    #!/usr/bin/env sh
    if nc -z localhost {{FIRESTORE_EMULATOR_PORT}} 2>/dev/null; then
        echo "Firestore emulator is already running."
    else
        echo "Starting Firestore emulator in background..."
        pnpm exec firebase emulators:start --only firestore --project lumos-web &
    fi

# Firestore エミュレータを停止
emulator-stop:
    #!/usr/bin/env sh
    PID=$(lsof -ti :{{FIRESTORE_EMULATOR_PORT}} -sTCP:LISTEN 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "Stopping Firestore emulator (PID: $PID)..."
        kill "$PID"
    else
        echo "No emulator running on port $FIRESTORE_EMULATOR_PORT."
    fi

# Firestore エミュレータのデータをリセット（再起動）
emulator-reset:
    #!/usr/bin/env sh
    PID=$(lsof -ti :{{FIRESTORE_EMULATOR_PORT}} -sTCP:LISTEN 2>/dev/null)
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
    if ! nc -z localhost {{FIRESTORE_EMULATOR_PORT}} 2>/dev/null; then
        echo "Starting Firestore emulator in background..."
        pnpm exec firebase emulators:start --only firestore --project lumos-web &
        echo "Waiting for emulator to be ready..."
        while ! nc -z localhost {{FIRESTORE_EMULATOR_PORT}} 2>/dev/null; do sleep 1; done
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

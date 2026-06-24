import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// `@/*` をプロジェクトルートに解決する（tsconfig の paths と対応）。
// これが無いと runtime で `@/lib/...` を import するテストが解決できず読み込めない。
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    // 共有リソース（globalThis.fetch のモック・Firestore エミュレータのデータ）が
    // ファイル間で干渉しないよう、テストファイルを並列実行せず逐次実行する。
    fileParallelism: false,
  },
});

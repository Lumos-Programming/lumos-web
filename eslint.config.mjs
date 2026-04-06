import nextConfig from "eslint-config-next";
import prettier from "eslint-config-prettier";

// Extract the @typescript-eslint plugin from eslint-config-next
const tsPlugin = nextConfig.find(
  (c) => c.plugins?.["@typescript-eslint"],
)?.plugins;

const eslintConfig = [
  ...nextConfig,
  prettier,
  {
    plugins: tsPlugin,
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    ignores: ["node_modules/", ".next/", "out/"],
  },
];

export default eslintConfig;

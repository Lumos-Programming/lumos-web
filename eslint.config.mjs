import nextConfig from "eslint-config-next";
import prettier from "eslint-config-prettier";

const eslintConfig = [
  ...nextConfig,
  prettier,
  {
    ignores: ["node_modules/", ".next/", "out/"],
  },
];

export default eslintConfig;

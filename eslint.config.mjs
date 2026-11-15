import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "build",
      "native",
      "android",
      "ios",
      "src-tauri",
      "dist",
      "coverage",
      "playwright-report",
      "test-results",
      "dev-dist",
      "docs/screenshots",
    ],
  },
  js.configs.recommended,
  { files: ["scripts/**/*.mjs"], languageOptions: { globals: globals.node } },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      eqeqeq: ["error", "always"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // Providers legitimately co-locate their hooks; HMR still works, it just does a full reload for these files.
    files: [
      "src/i18n/index.tsx",
      "src/state/context.tsx",
      "src/app/contexts.tsx",
      "src/components/toast.tsx",
      "src/features/settings/settings-dialog.tsx",
      "src/features/shell/sidebar.tsx",
    ],
    rules: { "react-refresh/only-export-components": "off" },
  },
);

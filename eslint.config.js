import js from "@eslint/js";
import ts from "typescript-eslint";
import svelte from "eslint-plugin-svelte";

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        extraFileExtensions: [".svelte"],
      },
    },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parser: ts.parser,
    },
  },
  {
    ignores: ["build/", ".svelte-kit/", "package/", "src-tauri/"],
  },
];

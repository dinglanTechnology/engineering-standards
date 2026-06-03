// @ts-check
// ESLint 9 扁平配置（flat config）
// 仅依赖 package.json 已声明的包：
//   @typescript-eslint/parser, @typescript-eslint/eslint-plugin,
//   eslint-plugin-prettier, eslint-config-prettier
// 运行：pnpm lint
import tsParser from "@typescript-eslint/parser"
import tsPlugin from "@typescript-eslint/eslint-plugin"
import prettierRecommended from "eslint-plugin-prettier/recommended"

export default [
  // 不参与 lint 的目录/文件
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "eslint.config.mjs"],
  },

  // 业务源码规则
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      sourceType: "module",
      parserOptions: {
        ecmaVersion: "latest",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // 团队约定：禁止 any（tsconfig 也开了 noImplicitAny，这里覆盖显式 any）
      "@typescript-eslint/no-explicit-any": "error",
      // 未使用变量告警；下划线前缀的参数/变量豁免（约定占位）
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // starter 里很多类只承载装饰器/DI，关掉这些噪音规则
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-extraneous-class": "off",
    },
  },

  // 放最后：把 prettier 作为 lint 规则跑，并关闭与 prettier 冲突的格式规则
  // （格式以 .prettierrc 为准）
  prettierRecommended,
]

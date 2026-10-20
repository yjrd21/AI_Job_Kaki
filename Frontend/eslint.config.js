import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

const sourceRoot = fileURLToPath(new URL("./src/", import.meta.url));
const boundaries = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      dependency: "{{from}} must not depend on {{to}}.",
      tests: "Test cases belong in Frontend/tests.",
    },
  },
  create(context) {
    const filename = context.filename;
    const from = path.relative(sourceRoot, filename).split(path.sep).join("/");
    const layer = from.split("/")[0];
    function check(node, specifier) {
      if (typeof specifier !== "string") return;
      const local = specifier.startsWith(".");
      const target = local
        ? path
            .relative(
              sourceRoot,
              path.resolve(path.dirname(filename), specifier),
            )
            .split(path.sep)
            .join("/")
        : specifier;
      const targetLayer = target.split("/")[0];
      const forbidden =
        (layer === "domain" && (!local || targetLayer !== "domain")) ||
        (layer === "application" &&
          (!local || !["domain", "application"].includes(targetLayer))) ||
        (layer === "adapters" &&
          local &&
          ["infrastructure", "app"].includes(targetLayer)) ||
        (layer === "infrastructure" && local && targetLayer === "app") ||
        (from.startsWith("adapters/views/") &&
          local &&
          /^adapters\/(repositories|clients)\//.test(target)) ||
        (local && target.startsWith("../")) ||
        (["domain", "application", "adapters", "infrastructure"].includes(
          layer,
        ) &&
          targetLayer === "main");
      if (forbidden)
        context.report({
          node,
          messageId: "dependency",
          data: { from, to: specifier },
        });
    }
    return {
      Program(node) {
        if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(filename))
          context.report({ node, messageId: "tests" });
      },
      ImportDeclaration: (node) => check(node, node.source.value),
      ExportNamedDeclaration: (node) => {
        if (node.source) check(node, node.source.value);
      },
      ExportAllDeclaration: (node) => check(node, node.source.value),
      ImportExpression: (node) => check(node, node.source.value),
    };
  },
};

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", "node_modules/**"] },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
  })),
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { architecture: { rules: { boundaries } } },
    rules: { "architecture/boundaries": "error" },
  },
);

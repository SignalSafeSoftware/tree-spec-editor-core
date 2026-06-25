import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    resolve: {
        alias: [
            {
                find: "@signalsafe/tree-spec-editor-core",
                replacement: path.resolve(packageRoot, "src/index.ts"),
            },
            {
                find: /^@signalsafe\/tree-spec-editor-core\/(.+)$/,
                replacement: path.resolve(packageRoot, "src") + "/$1",
            },
        ],
    },
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**"],
            exclude: ["src/**/*.d.ts"],
            reporter: ["text", "lcov"],
            reportsDirectory: "coverage",
        },
    },
});

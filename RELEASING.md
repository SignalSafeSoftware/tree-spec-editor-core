# Releasing @signalsafe/tree-spec-editor-core

Framework-agnostic TreeSpec editor model and helpers (`npm install @signalsafe/tree-spec-editor-core`).

**Depends on:** `@signalsafe/tree-spec` (publish that first).

**Monorepo source of truth:** `packages/tree-spec-editor-core` in [DeliveryPlus](https://github.com/SignalSafeSoftware/DeliveryPlus).

## One-time setup

```bash
bash scripts/push-standalone-npm-package.sh tree-spec-editor-core --create-repo
```

Remote: `https://github.com/SignalSafeSoftware/tree-spec-editor-core` (use SSH for `git push`).

## Release workflow

1. Develop in `packages/tree-spec-editor-core`.
2. Align `dependencies` version for `@signalsafe/tree-spec`.
3. Bump `package.json` version.
4. Test: `npm ci && npm test && npm run build`.
5. Sync: `bash scripts/push-standalone-npm-package.sh tree-spec-editor-core`
6. Publish: `npm publish --access public` or GitHub **Release** (triggers `publish.yml`).

## Pre-release checks

```bash
npm ci
npm run typecheck
npm test
npm run build
npm publish --dry-run
```

Tarball should include `package.json`, `README.md`, `LICENSE`, and `dist/**` only.

I reviewed the accessible files in `SignalSafeSoftware/tree-spec-editor-core`. Overall: **this is a useful, well-separated package, but it is less “public-package polished” than `tree-spec` because the README is more of an architecture inventory than a user guide, and the CI/publish setup needs tightening.**

## Executive take

The package boundary is good. `package.json` clearly describes this as a framework-agnostic TreeSpec editor core with “no UI, no React, no DOM,” exposes only `dist`, `README.md`, and `LICENSE`, and publishes as ESM with declarations.

The code also mostly matches the stated design. The README says the package owns editor model types, pure tree operations, transition helpers, layout helpers, connection validation, editor history, appearance linting, and wire coercion.  The barrel export confirms that this is the public surface.

My biggest concerns are:

1. **The README needs runnable examples.**
2. **CI can publish from PR label flow, which I would remove.**
3. **`tsconfig` includes DOM even though the package promises no DOM.**
4. **`editorTreesEqual` uses `JSON.stringify`, which can be brittle/performance-heavy.**
5. **The package depends on the weaker `tree-spec` wire linter in `coerceTreeSpecWireForEditor`.**
6. **There is no visible `SECURITY.md` or standalone changelog in this repo.**

## Documentation advice

Your README is accurate but not yet very usable for an outside consumer. It explains ownership well, but it lacks installation, quick start, common recipes, and API examples.

Add these sections.

### 1. Install

````md
## Install

```bash
npm install @signalsafe/tree-spec-editor-core @signalsafe/tree-spec
````

This package is ESM-only and targets Node 18+.

````

The package requires Node `>=18` and depends on `@signalsafe/tree-spec` plus `dagre`. 

### 2. Quick start

Give a minimal “load → lint → layout” example:

```ts
import {
  autoLayoutTree,
  coerceTreeSpecWireForEditor,
  lintEditorTree,
} from "@signalsafe/tree-spec-editor-core";
import { decompileTreeSpec } from "@signalsafe/tree-spec";

const wire = coerceTreeSpecWireForEditor(rawPayload);
if (!wire) {
  throw new Error("Invalid TreeSpec payload");
}

const tree = decompileTreeSpec(wire);
const issues = lintEditorTree(tree);
const laidOut = autoLayoutTree(tree);

console.log(issues, laidOut);
````

This is especially important because `coerceTreeSpecWireForEditor` has nuanced behavior: `null`, empty objects, and primitive non-object values bootstrap a starter wire, arrays return `null`, and structurally invalid objects return `null`.

### 3. Recipes

Add copy-paste examples for:

```ts
applyEditorConnect(...)
applyEditorReconnect(...)
duplicateNode(...)
deleteNode(...)
applyTreeTemplate(...)
pushEditorHistory(...)
undoEditorHistory(...)
redoEditorHistory(...)
patchChoiceEdgeHints(...)
lintEditorAppearance(...)
```

Right now the README lists these APIs, but it does not show usage.

### 4. Clarify “no DOM”

The README says “no React, no DOM.”  However, `tsconfig.json` includes `"DOM"` in `lib`.  That does not prove DOM is used at runtime, but it allows accidental use of browser globals to typecheck.

I would either remove DOM from `lib`:

```json
"lib": ["ES2022"]
```

or soften the README claim to:

```md
This package has no UI runtime dependencies and does not intentionally access DOM APIs.
```

Given your architecture goal, I’d remove `"DOM"` and let typecheck enforce the no-DOM rule.

### 5. Fix monorepo links

The README points to relative monorepo docs like `../../docs/ai/packages-editor-architecture.md`, `../MIGRATIONS.md`, and `../CHANGELOG.md`.  In a standalone GitHub repo, those links probably will not resolve correctly. Replace them with either absolute links to the monorepo or add local docs.

## Test advice

The test setup itself is good: Vitest runs in Node, includes `tests/**/*.test.ts`, collects V8 coverage for `src/**`, and emits text plus LCOV reports.  Sonar is configured to read the tests and coverage report.

The one test file I could read, `tests/index.test.ts`, checks the public barrel exports and confirms UI components are not exposed. That is useful for package-boundary protection.

I would add or verify coverage for these core behaviors:

### 1. `lintEditorTree`

The implementation is much stronger than the base `tree-spec` linter. It checks duplicate transitions, missing transitions, missing target nodes, unreachable nodes, paths that do not reach END, missing END outcomes, and appearance lint.

Add tests for:

```ts
it("flags duplicate transition for the same node choice")
it("flags missing transition for every choice")
it("flags transition to missing node")
it("warns for unreachable nodes")
it("errors when a reachable path cannot reach END")
it("does not infinite-loop on graph cycles")
it("flags missing END outcome")
```

### 2. Cycle behavior

`nodeCanReachEnd` treats revisiting a node as failure.  That is probably correct for a decision-tree editor, but document and test it. If loops are intentionally invalid, make that explicit in README.

### 3. Connection validation

`isValidEditorConnection` rejects missing source/target, source END, self-connections, invalid choice handles, missing source nodes, missing target nodes, and target handles other than empty/`in`.

Add tests for each rejected case and for END connections defaulting outcomes to `at_risk`. `applyEditorConnect` and `applyEditorReconnect` currently default END outcomes to `TERMINAL_OUTCOME.AT_RISK`.

That default may be okay for editor UX, but it should be covered.

### 4. Layout determinism

`autoLayoutTree` uses Dagre, reachable node traversal, a virtual END sink, unreachable-column placement, snap grid, collision nudging, and graph editor metadata patching.

Add tests for:

```ts
needsInitialLayout
snapToGrid / snapPosition
locked nodes not being moved
unreachable nodes placed in trailing column
END position persisted into _meta.graph_editor
layout does not mutate the original tree unexpectedly
```

### 5. `coerceTreeSpecWireForEditor`

This function is important because it handles untrusted or partially missing payloads. Test:

```ts
null -> starter wire
{} -> starter wire
"bad" -> starter wire
[] -> null
{ nodes: {}, start_node: "" } -> starter wire
invalid wire_version -> null
valid wire -> same wire
```

The behavior is encoded in lines 36–54.

### 6. Public package tarball test

Add a CI test that packs the package and imports from the packed tarball. This catches broken `exports`, missing declarations, or missing files.

```bash
yarn build
npm pack
mkdir /tmp/editor-core-smoke
cd /tmp/editor-core-smoke
npm init -y
npm install /path/to/signalsafe-tree-spec-editor-core-*.tgz
node -e "import('@signalsafe/tree-spec-editor-core').then(m => console.log(Object.keys(m).length))"
```

## Security and release safety

### 1. Publish workflow needs hardening

The CI workflow can publish on `workflow_dispatch` or on a pull request with a `publish` label, assuming checks/tests/scan pass.  I would not publish from PR events.

Use one of these instead:

```yaml
on:
  push:
    tags:
      - "tree-spec-editor-core-v*"
```

or manual dispatch only from `main` with an environment approval:

```yaml
environment: npm-production
permissions:
  contents: read
  id-token: write
```

Also consider npm provenance/trusted publishing.

### 2. PR checks are label-gated

Typecheck and tests run on push and workflow dispatch, but PR checks only run if labels like `checks` or `tests` are present.  For a public package, I would run typecheck and tests on every PR by default. Keep only Sonar or publish behind labels/manual gates.

### 3. Add `SECURITY.md`

I checked for `SECURITY.md` and did not find it. Since this package is used by a security-awareness editor, add one even if the package is not security-sensitive by itself.

```md
# Security Policy

Please report vulnerabilities privately.

Email: security@signalsafe.software

Do not open public issues for suspected vulnerabilities.
```

### 4. Consider dependency risk from `dagre`

`dagre` is a real runtime dependency.  That is fine, but it means this package is not dependency-free. Document that it uses Dagre for layout. You already mention Dagre in the README and keywords.

Security-wise, enable Dependabot for npm dependencies and GitHub Actions.

## Code-quality observations

### 1. `editorTreesEqual` is brittle

```ts
export function editorTreesEqual(a: EditorTree, b: EditorTree): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}
```

This can be okay for plain JSON-like objects, but it is order-sensitive and can be expensive for large trees. Since your tree is likely JSON-like, it may be acceptable, but I would rename it to signal semantics:

```ts
editorTreeJsonEqual(...)
```

or replace it with a deterministic normalized comparison.

### 2. `structuredClone` requires modern runtime support

`cloneEditorTree` uses `structuredClone`.  Node 18 supports it, so this is okay with your `engines` setting.  Browser consumers should also be fine in modern environments, but mention Node 18+ / modern browsers in README.

### 3. `parsePydanticOutcomeErrors` is fragile

The parser uses a regex against Pydantic error text:

```ts
/input_value=\{'from': \['([^']+)', '([^']+)'\],[^}]*\}/g
```

That is okay as a fallback, but it is brittle across Pydantic versions and formatting changes. Better: have the backend return structured validation issues with `node_id` and `choice_id`, then keep this parser only for legacy compatibility.

### 4. `GraphEditorIssue.severity` is too loose

`GraphEditorIssue` uses `severity: string`.  You already have `TreeSpecIssue` and issue severity constants in `@signalsafe/tree-spec`. I would align it:

```ts
import type { TreeSpecIssueSeverity } from "@signalsafe/tree-spec";

export interface GraphEditorIssue {
  severity: TreeSpecIssueSeverity;
  message: string;
  node_id?: string;
  choice_id?: string;
}
```

### 5. The package still has framework vocabulary in types

`ReactFlowNodeChange` and `ReactFlowEdgeChange` exist in `model.ts`.  They are tiny structural interfaces, so it is not a runtime dependency, but the names slightly weaken the “framework-agnostic” story.

Consider renaming them:

```ts
CanvasNodeChange
CanvasEdgeChange
```

Then export aliases for backward compatibility if needed.

## Packaging advice

The package metadata is solid: scoped package, ESM, `exports`, declaration files, `sideEffects: false`, public publish config, Node engine, and limited package files.

I would change:

### 1. Add `packageManager`

Since the repo uses Yarn v1 lockfile and CI uses Yarn, make it explicit:

```json
"packageManager": "yarn@1.22.22"
```

The lockfile is Yarn v1.

### 2. Reconsider `prepare`

`prepare` runs `npm run build`.  This can surprise contributors and consumers installing from git. You already have `prepublishOnly`. I’d usually remove `prepare` unless you specifically need git installs to build.

### 3. Monorepo script should be clearly marked

`test:monorepo` changes into `../../frontend`, which probably will not exist in the standalone package repo.  Either remove it from the standalone repo, rename it to something obviously internal, or document it.

## What I would do first

1. **Remove DOM from `tsconfig.json`** to enforce the no-DOM promise.
2. **Add README quick-start and recipes**, especially for `coerceTreeSpecWireForEditor`, `lintEditorTree`, `autoLayoutTree`, connection validation, and history.
3. **Change CI so tests/typecheck run on every PR.**
4. **Remove PR-label publishing; publish only from tags/releases/manual main with approval.**
5. **Add `SECURITY.md` and local `CHANGELOG.md`.**
6. **Add tarball smoke test to CI.**
7. **Add tests for `lintEditorTree`, `coerceTreeSpecWireForEditor`, connection validation, and layout determinism.**
8. **Tighten `GraphEditorIssue.severity` and consider renaming ReactFlow-flavored types.**
9. **Document cycle semantics: loops are invalid unless you intentionally support them.**
10. **Replace or rename `editorTreesEqual` so future readers understand it is JSON/order-based equality.**

My honest assessment: **this is a good extracted core package and the boundaries are mostly right. Before treating it as stable public infrastructure, I would harden CI publishing and add consumer-facing docs/tests.**

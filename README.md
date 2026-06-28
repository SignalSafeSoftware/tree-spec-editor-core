# @signalsafe/tree-spec-editor-core

Framework-agnostic core for the SignalSafe **TreeSpec graph editor**: editor model types, pure tree operations, layout, validation, and keyboard/autosave helpers.

| | |
|---|---|
| **npm** | `@signalsafe/tree-spec-editor-core` |
| **GitHub** | [SignalSafeSoftware/tree-spec-editor-core](https://github.com/SignalSafeSoftware/tree-spec-editor-core) |
| **Depends on** | `@signalsafe/tree-spec`, `dagre` |

## What this package does

- Defines the **editor model** (`EditorTree`, `EditorNode`, `EditorTransition`, selection types).
- Provides **pure functions** for tree edits: duplicate/delete nodes, transitions, layout, lint, undo/redo stacks, choice templates.
- Coerces and validates wire JSON for editor use (`coerceTreeSpecWireForEditor`, `lintEditorTree`).
- Reads/writes graph-editor metadata namespaces from `@signalsafe/tree-spec`.

## What this package does not do

- **No React, DOM, React Flow, or Bootstrap** — safe for Node scripts and non-React hosts.
- **No HTTP, auth, persistence, or routing** — host apps load/save drafts and enforce permissions.
- **No canvas rendering** — use `@signalsafe/tree-spec-editor-react` or a custom canvas.

## Install

```bash
npm install @signalsafe/tree-spec-editor-core @signalsafe/tree-spec
```

Peer/runtime: Node.js 22.12+ (see `package.json` `engines`).

## Quick start

```ts
import {
    END_NODE_ID,
    lintEditorTree,
    autoLayoutTree,
    type EditorTree,
} from "@signalsafe/tree-spec-editor-core";

const tree: EditorTree = autoLayoutTree({
    start_node: "start",
    nodes: {
        start: {
            id: "start",
            type: "prompt",
            prompt: "Choose a response",
            choices: [{ id: "go", label: "Continue" }],
            position: { x: 0, y: 0 },
        },
    },
    transitions: [
        {
            id: "t1",
            fromNodeId: "start",
            fromChoiceId: "go",
            toNodeId: END_NODE_ID,
            outcome: "safe",
        },
    ],
});

const issues = lintEditorTree(tree);
console.log(issues); // []
```

## Public exports (main entry)

Import from `@signalsafe/tree-spec-editor-core` only (no subpath exports).

| Area | Key exports |
|---|---|
| Model | `EditorTree`, `EditorNode`, `EditorTransition`, `EditorChoice`, `GraphSelection`, `GraphEditorIssue`, `END_NODE_ID`, `GRAPH_SELECTION_KIND` |
| Tree ops | `duplicateNode`, `deleteNode`, `computeTreeDiffSummary`, `applyTreeTemplate`, `getTransition`, `upsertTransition`, `deleteTransitionsForChoice` |
| Layout | `autoLayoutTree`, `getNextSpawnPosition` |
| Lint / wire | `lintEditorTree`, `lintEditorAppearance`, `coerceTreeSpecWireForEditor`, `parsePydanticOutcomeErrors` |
| History | `pushEditorHistory`, `popEditorUndo`, `popEditorRedo`, `createEditorHistoryStack` |
| Keyboard / autosave | `getKeyboardShortcutAction`, `getAutosaveStatusLabel`, `shouldQueueInitialValidation` |
| Re-exported wire types | `TreeSpecWire`, `TreeSpecIssue`, `readGraphEditorMeta`, `writeGraphEditorMeta`, … |

See `src/index.ts` for the full barrel.

## Package boundaries

| Layer | Package |
|---|---|
| Wire contract | `@signalsafe/tree-spec` |
| **Editor model & helpers (this package)** | `@signalsafe/tree-spec-editor-core` |
| React Flow canvas | `@signalsafe/tree-spec-editor-react` |
| Bootstrap UI shell | `@signalsafe/tree-spec-editor` |

## Development

Requires Node.js **>=22.12.0** (`engines.node`). CI runs checks, tests, and smoke on Node **22** and **24**; publish uses Node **24**. Node 20 is no longer supported (GitHub Actions Node 20 deprecation).

From this repository:

`yarn build` uses `tsconfig.build.json` and resolves `@signalsafe/*` from `node_modules`. Ecosystem sibling `paths` in `tsconfig.json` apply to local typecheck/tests only.

```bash
yarn install
yarn build
yarn test
yarn typecheck
```

## Security

See [SECURITY.md](./SECURITY.md). This package manipulates **authoring data in memory**. Host applications must enforce authorization, validate content server-side, and control who may publish scenarios.

## Changelog and releases

- [CHANGELOG.md](./CHANGELOG.md)
- [RELEASING.md](./RELEASING.md)

## Related reading

- [`@signalsafe/tree-spec`](https://github.com/SignalSafeSoftware/tree-spec) — wire format and graph-editor metadata namespaces.
- [`@signalsafe/tree-spec-editor-react`](https://github.com/SignalSafeSoftware/tree-spec-editor-react) — React canvas and `useTreeSpecEditor`.

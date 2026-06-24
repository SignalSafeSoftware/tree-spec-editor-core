# @signalsafe/tree-spec-editor-core

Framework-agnostic core for the SignalSafe TreeSpec graph editor. Provides the
editor model, structural helpers, and shared constants used by the React
implementation (`@signalsafe/tree-spec-editor`) and any future Angular / Vue /
Solid implementations.

This package has **no UI dependencies**: no React, no DOM, no `react-bootstrap`,
no `reactflow`. It is safe to import from Node scripts, server-side code, or any
strict TypeScript project.

## What this package owns

- **Editor model types** — `EditorTree`, `EditorNode`, `EditorTransition`,
  `EditorChoice`, `GraphSelection`, `GraphSelectionKind`,
  `GraphEditorIssue`, `TreeSpecSnapshotItem`, `TreeSpecAuditEventItem`.
- **Pure tree operations** — `duplicateNode`, `deleteNode`,
  `computeTreeDiffSummary`, `applyTreeTemplate` (and the
  `TreeTemplateSpec` / `TreeTemplateNodeSpec` / `TreeTemplateTransitionSpec`
  / `ApplyTreeTemplateOptions` / `TreeDiffSummary` types).
- **Transition helpers** — `getTransition`, `upsertTransition`,
  `deleteTransitionsForChoice`, `lintEditorTree`,
  `parsePydanticOutcomeErrors`, `safeUUID`.
- **Layout helpers** — `autoLayoutTree`, `getNextSpawnPosition`.
- **Lifecycle helpers** — `getAutosaveStatusLabel`,
  `getKeyboardShortcutAction`, `shouldQueueInitialValidation`.
- **Choice edge hints** — `getChoiceEdgeHints`, `patchChoiceEdgeHints`,
  `resolveDefaultEdgeType`, `resolveEffectiveEdgeType`,
  `resolveEdgeStrokeColor`, `resolveEdgeStrokeColorForDisplay`,
  `DEFAULT_CANVAS_EDGE_STROKE`, `DEFAULT_EDGE_TYPE`,
  `EDITOR_EDGE_TYPE_OPTIONS`, `shouldShowEdgeLabel`.
  Use **`resolveEdgeStrokeColorForDisplay`** in appearance fields so an unset
  stroke previews as **`DEFAULT_CANVAS_EDGE_STROKE`** (React Flow gray), not a
  host theme color.
- **Constants** — `AUTOSAVE_STATUS`, `KEYBOARD_SHORTCUT_ACTION`,
  `GRAPH_SELECTION_KIND`, `TREE_SPEC_NODE_TYPE_PRESETS`, `END_NODE_ID`,
  `buildStableEntries`.
- **Connection validation** — `isValidEditorConnection`, `applyEditorConnect`,
  `applyEditorReconnect`, `applyEditorConnectOnDrop`, `choiceIdFromHandle`.
- **Editor history** — `pushEditorHistory`, `canUndoEditorHistory`,
  `canRedoEditorHistory`, `undoEditorHistory`, `redoEditorHistory`,
  `createEditorHistoryStack`.
- **Choice templates** — `appendChoiceTemplate` (pair with shell
  `ChoiceTemplatesPanel` for custom host layouts).
- **Wire coercion** — `coerceTreeSpecWireForEditor`.
- **Appearance lint** — `lintEditorAppearance` (included in `lintEditorTree`).
- **Layout** — dagre-based `autoLayoutTree` with 20px snap grid (`LAYOUT_SNAP_GRID`).
- **Node / graph meta hints** — `getThemeHints` (legacy `render_hints.theme`), `getEditorHints`, `patchEditorHints`, `editorHintsToStyle`, `readGraphEditorMeta`, `writeDefaultEdgeType`, etc.

## What lives in framework packages instead

| Concern | Package |
|--------|---------|
| React Flow canvas (headless React, no UI library) | `@signalsafe/tree-spec-editor-react` |
| React + Bootstrap panels, modals, toolbar | `@signalsafe/tree-spec-editor` |
| React + Material UI shell (planned) | `@signalsafe/tree-spec-editor-react-mui` |
| Angular shell + canvas (planned) | `@signalsafe/tree-spec-editor-angular` |
| Vue shell + canvas (planned) | `@signalsafe/tree-spec-editor-vue` |

See [docs/ai/packages-editor-architecture.md](../../docs/ai/packages-editor-architecture.md) for layer rules and what each future package may import.

## Refactoring / simplification

Internal file splits and type hardening are described in [docs/ai/packages-simplification-refactor-plan.md](../../docs/ai/packages-simplification-refactor-plan.md). Refactors must **not** move React, DOM, or reactflow code into this package.

## Versioning

Bumped on every additive change. Breaking changes are documented in the
monorepo [MIGRATIONS.md](../MIGRATIONS.md) with a paired entry in
[CHANGELOG.md](../CHANGELOG.md).

## Repository

Standalone source and releases: [SignalSafeSoftware/tree-spec-editor-core](https://github.com/SignalSafeSoftware/tree-spec-editor-core).

Published as [`@signalsafe/tree-spec-editor-core`](https://www.npmjs.com/package/@signalsafe/tree-spec-editor-core) on npm.

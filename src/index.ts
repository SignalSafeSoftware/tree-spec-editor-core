/**
 * @packageDocumentation
 * Framework-agnostic TreeSpec editor model, helpers, and constants.
 *
 * This package contains zero UI dependencies (no React, no DOM, no Bootstrap)
 * and is consumed by every framework-specific editor implementation
 * (`@signalsafe/tree-spec-editor`, planned Angular and Material shells).
 *
 * Source layout:
 * - `model.ts` — editor-facing types re-exported from `@signalsafe/tree-spec`
 * - `lib/` — pure tree helpers (layout, transitions, templates, issue text,
 *           autosave status, keyboard shortcuts, stable-key helpers)
 */

export { END_NODE_ID, GRAPH_SELECTION_KIND } from './model';
export type {
    EditorChoice,
    EditorNode,
    EditorTransition,
    EditorTree,
    GraphEditorIssue,
    GraphSelection,
    GraphSelectionKind,
    ReactFlowEdgeChange,
    ReactFlowNodeChange,
    TreeSpecAuditEventItem,
    TreeSpecSnapshotItem,
} from './model';

export {
    applyEditorConnect,
    applyEditorReconnect,
    choiceIdFromHandle,
    isValidEditorConnection,
} from './lib/connectionValidation';
export type { EditorConnection } from './lib/connectionValidation';

export {
    appendChoiceTemplate,
    applyEditorConnectOnDrop,
} from './lib/choiceTemplates';
export type { AppendChoiceTemplateInput, ConnectOnDropOptions } from './lib/choiceTemplates';

export {
    safeUUID,
    getTransition,
    upsertTransition,
    deleteTransitionsForChoice,
    lintEditorTree,
    moveChoiceInTree,
    moveNodeChoice,
    renameNodeChoiceId,
    parsePydanticOutcomeErrors,
    shouldQueueInitialValidation,
    TREE_SPEC_NODE_TYPE_PRESETS,
} from './lib/editorHelpers';
export type { MoveNodeChoiceDirection, TreeSpecNodeTypePreset } from './lib/editorHelpers';

export { lintEditorAppearance } from './lib/lintEditorAppearance';

export {
    DEFAULT_CANVAS_EDGE_STROKE,
    DEFAULT_EDGE_TYPE,
    EDITOR_EDGE_TYPE_OPTIONS,
    getChoiceEdgeHints,
    patchChoiceEdgeHints,
    resolveDefaultEdgeType,
    resolveEffectiveEdgeType,
    resolveEdgeStrokeColor,
    resolveEdgeStrokeColorForDisplay,
    shouldShowEdgeLabel,
} from './lib/choiceEdgeHints';
export type { ChoiceEdgeHints } from './lib/choiceEdgeHints';

export {
    autoLayoutTree,
    DEFAULT_NODE_LAYOUT_HEIGHT,
    END_LAYOUT_WIDTH,
    getNextSpawnPosition,
    LAYOUT_SNAP_GRID,
    needsInitialLayout,
    snapPosition,
    snapToGrid,
} from './lib/treeLayout';

export {
    getThemeHints,
    getEditorHints,
    isNodeLocked,
    patchEditorHints,
    editorHintsToStyle,
    RENDER_HINTS_THEME_NS,
    RENDER_HINTS_EDITOR_NS,
    GRAPH_POSITION_KEY,
    DEFAULT_GRAPH_NODE_WIDTH,
    DEFAULT_NODE_TEXT_WRAP,
    resolveCanvasNodeWidth,
    resolveNodeTextWrap,
    nodeTextWrapClassName,
} from './lib/nodeHints';
export type { NodeEditorHints, GraphPosition, NodeTextWrap } from './lib/nodeHints';

export { getAutosaveStatusLabel, AUTOSAVE_STATUS } from './lib/autosave';
export type { AutosaveStatus } from './lib/autosave';

export {
    LEGACY_DEFAULT_END_POSITION,
    computeDefaultEndPosition,
    resolveEndNodePosition,
    resolveGraphViewport,
    patchGraphEditorMeta,
} from './lib/graphEditorLayout';
export type { GraphEditorViewport } from '@signalsafe/tree-spec';
export { readGraphEditorMeta, writeGraphEditorMeta, GRAPH_EDITOR_META_NS } from '@signalsafe/tree-spec';
export type { GraphEditorMeta } from '@signalsafe/tree-spec';

export { getKeyboardShortcutAction, KEYBOARD_SHORTCUT_ACTION } from './lib/keyboardShortcuts';
export type {
    KeyboardShortcutAction,
    KeyboardShortcutParams,
} from './lib/keyboardShortcuts';

export {
    MAX_EDITOR_HISTORY,
    canRedoEditorHistory,
    canUndoEditorHistory,
    clearEditorHistory,
    cloneEditorTree,
    createEditorHistoryStack,
    editorTreesEqual,
    popEditorRedo,
    popEditorUndo,
    pushEditorHistory,
} from './lib/editorHistory';
export type { EditorHistoryStack } from './lib/editorHistory';

export {
    applyTreeTemplate,
    computeTreeDiffSummary,
    deleteNode,
    duplicateNode,
} from './lib/treeOperations';
export type {
    ApplyTreeTemplateOptions,
    TreeDiffSummary,
    TreeTemplateNodeSpec,
    TreeTemplateSpec,
    TreeTemplateTransitionSpec,
} from './lib/treeOperations';

export { buildStableEntries } from './lib/panelHelpers';

export { resolveGraphSelectionFocus } from './lib/selectionFocus';
export type { GraphSelectionFocus } from './lib/selectionFocus';

export { coerceTreeSpecWireForEditor } from './lib/coerceTreeSpecWire';

export type { TreeSpecIssue, TreeSpecWire, GraphEditorEdgeType } from '@signalsafe/tree-spec';

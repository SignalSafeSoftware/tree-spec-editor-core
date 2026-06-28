import { describe, expect, it } from 'vitest';
import * as editorCore from '../src/index';

const FUNCTION_EXPORTS = [
    'applyEditorConnect',
    'applyEditorReconnect',
    'choiceIdFromHandle',
    'isValidEditorConnection',
    'appendChoiceTemplate',
    'applyEditorConnectOnDrop',
    'safeUUID',
    'getTransition',
    'upsertTransition',
    'deleteTransitionsForChoice',
    'lintEditorTree',
    'moveChoiceInTree',
    'moveNodeChoice',
    'renameNodeChoiceId',
    'parsePydanticOutcomeErrors',
    'shouldQueueInitialValidation',
    'lintEditorAppearance',
    'getChoiceEdgeHints',
    'patchChoiceEdgeHints',
    'resolveDefaultEdgeType',
    'resolveEffectiveEdgeType',
    'resolveEdgeStrokeColor',
    'resolveEdgeStrokeColorForDisplay',
    'shouldShowEdgeLabel',
    'autoLayoutTree',
    'getNextSpawnPosition',
    'needsInitialLayout',
    'snapPosition',
    'snapToGrid',
    'getThemeHints',
    'getEditorHints',
    'isNodeLocked',
    'patchEditorHints',
    'editorHintsToStyle',
    'resolveCanvasNodeWidth',
    'resolveNodeTextWrap',
    'nodeTextWrapClassName',
    'getAutosaveStatusLabel',
    'computeDefaultEndPosition',
    'resolveEndNodePosition',
    'resolveGraphViewport',
    'patchGraphEditorMeta',
    'readGraphEditorMeta',
    'writeGraphEditorMeta',
    'getKeyboardShortcutAction',
    'canRedoEditorHistory',
    'canUndoEditorHistory',
    'clearEditorHistory',
    'cloneEditorTree',
    'createEditorHistoryStack',
    'editorTreesEqual',
    'popEditorRedo',
    'popEditorUndo',
    'pushEditorHistory',
    'applyTreeTemplate',
    'computeTreeDiffSummary',
    'deleteNode',
    'duplicateNode',
    'buildStableEntries',
    'resolveGraphSelectionFocus',
    'coerceTreeSpecWireForEditor',
] as const;

describe('public barrel exports', () => {
    it('exposes documented runtime functions', () => {
        for (const name of FUNCTION_EXPORTS) {
            expect(typeof editorCore[name]).toBe('function');
        }
    });

    it('re-exports graph editor meta helpers from tree-spec', () => {
        const nextMeta = editorCore.writeGraphEditorMeta(undefined, {
            viewport: { x: 1, y: 2, zoom: 1 },
        });
        expect(editorCore.readGraphEditorMeta(nextMeta).viewport).toEqual({
            x: 1,
            y: 2,
            zoom: 1,
        });
    });
});

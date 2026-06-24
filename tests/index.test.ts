import { describe, expect, it } from 'vitest';
import * as packageExports from '../src/index';
import { END_NODE_ID } from '../src/model';

describe('@signalsafe/tree-spec-editor-core barrel', () => {
    it('re-exports the public package surface', () => {
        expect(packageExports.END_NODE_ID).toBe(END_NODE_ID);

        expect(packageExports.safeUUID).toBeTypeOf('function');
        expect(packageExports.getTransition).toBeTypeOf('function');
        expect(packageExports.upsertTransition).toBeTypeOf('function');
        expect(packageExports.deleteTransitionsForChoice).toBeTypeOf('function');
        expect(packageExports.lintEditorTree).toBeTypeOf('function');
        expect(packageExports.parsePydanticOutcomeErrors).toBeTypeOf('function');
        expect(packageExports.shouldQueueInitialValidation).toBeTypeOf('function');

        expect(packageExports.autoLayoutTree).toBeTypeOf('function');
        expect(packageExports.getNextSpawnPosition).toBeTypeOf('function');

        expect(packageExports.duplicateNode).toBeTypeOf('function');
        expect(packageExports.deleteNode).toBeTypeOf('function');
        expect(packageExports.computeTreeDiffSummary).toBeTypeOf('function');
        expect(packageExports.applyTreeTemplate).toBeTypeOf('function');

        expect(packageExports.getAutosaveStatusLabel).toBeTypeOf('function');
        expect(packageExports.getKeyboardShortcutAction).toBeTypeOf('function');
        expect(packageExports.pushEditorHistory).toBeTypeOf('function');
        expect(packageExports.applyEditorConnectOnDrop).toBeTypeOf('function');
        expect(packageExports.appendChoiceTemplate).toBeTypeOf('function');

        expect(packageExports.buildStableEntries).toBeTypeOf('function');

        expect(packageExports.AUTOSAVE_STATUS).toEqual({
            IDLE: 'idle',
            DIRTY: 'dirty',
            SAVING: 'saving',
            SAVED: 'saved',
        });
        expect(packageExports.KEYBOARD_SHORTCUT_ACTION).toEqual({
            SAVE: 'save',
            VALIDATE: 'validate',
            PREVIEW: 'preview',
            DUPLICATE: 'duplicate',
            DELETE: 'delete',
            UNDO: 'undo',
            REDO: 'redo',
            COPY: 'copy',
            PASTE: 'paste',
        });
        expect(packageExports.GRAPH_SELECTION_KIND).toEqual({
            NODE: 'node',
            EDGE: 'edge',
        });
        expect(packageExports.TREE_SPEC_NODE_TYPE_PRESETS).toContain('outcome');
    });

    it('does not import any UI/runtime modules', () => {
        const surface = Object.keys(packageExports);
        expect(surface).not.toContain('IssuesPanel');
        expect(surface).not.toContain('NodesPanel');
        expect(surface).not.toContain('AdvancedJsonPanel');
        expect(surface).not.toContain('InspectorPanel');
        expect(surface).not.toContain('SelectedEdgePanel');
        expect(surface).not.toContain('PublishReviewModal');
        expect(surface).not.toContain('DraftHistoryModal');
        expect(surface).not.toContain('AuditLogModal');
        expect(surface).not.toContain('ToolbarPanel');
        expect(surface).not.toContain('getIssueSeverityBadgeClass');
    });
});

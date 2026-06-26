import { describe, expect, it } from 'vitest';

import { applyEditorReconnect } from '../../src/lib/connectionValidation';
import {
    createEditorHistoryStack,
    popEditorRedo,
    popEditorUndo,
} from '../../src/lib/editorHistory';
import { getKeyboardShortcutAction } from '../../src/lib/keyboardShortcuts';
import { isNodeLocked } from '../../src/lib/nodeHints';
import { snapPosition } from '../../src/lib/treeLayout';
import { END_NODE_ID, type EditorTree } from '../../src/model';

function sampleTree(): EditorTree {
    return {
        start_node: 'start',
        nodes: {
            start: {
                id: 'start',
                type: 'prompt',
                prompt: 'Pick',
                choices: [{ id: 'c1', label: 'Go' }],
                position: { x: 0, y: 0 },
            },
            review: {
                id: 'review',
                type: 'prompt',
                prompt: 'Review',
                choices: [],
                position: { x: 200, y: 0 },
            },
        },
        transitions: [
            { id: 't1', fromNodeId: 'start', fromChoiceId: 'c1', toNodeId: 'review' },
        ],
    };
}

describe('editorHistory edge cases', () => {
    it('returns null when undo or redo stacks are empty', () => {
        const stack = createEditorHistoryStack();
        const tree = sampleTree();
        expect(popEditorUndo(stack, tree)).toBeNull();
        expect(popEditorRedo(stack, tree)).toBeNull();
    });
});

describe('layout helpers', () => {
    it('snaps positions to the layout grid', () => {
        expect(snapPosition({ x: 13, y: 27 })).toEqual({ x: 20, y: 20 });
    });
});

describe('node lock hints', () => {
    it('detects locked nodes from editor render hints', () => {
        const locked = {
            id: 'n1',
            type: 'prompt' as const,
            prompt: 'Locked',
            choices: [],
            render_hints: { editor: { locked: true } },
        };
        const unlocked = {
            id: 'n2',
            type: 'prompt' as const,
            prompt: 'Free',
            choices: [],
        };
        expect(isNodeLocked(locked)).toBe(true);
        expect(isNodeLocked(unlocked)).toBe(false);
    });
});

describe('connection validation edge cases', () => {
    it('returns null when reconnecting to an invalid target', () => {
        const tree = sampleTree();
        const result = applyEditorReconnect(
            tree,
            { id: 't1', source: 'start', sourceHandle: 'choice:c1', target: 'review' },
            { source: 'start', target: 'missing', targetHandle: 'in' },
        );
        expect(result).toBeNull();
    });

    it('returns null when reconnect source node changes', () => {
        const tree = sampleTree();
        const result = applyEditorReconnect(
            tree,
            { id: 't1', source: 'start', sourceHandle: 'choice:c1', target: 'review' },
            { source: 'review', target: END_NODE_ID, targetHandle: 'in' },
        );
        expect(result).toBeNull();
    });
});

describe('keyboard shortcut guards', () => {
    it('ignores redo when redo is unavailable', () => {
        expect(
            getKeyboardShortcutAction({
                ctrlKey: true,
                metaKey: false,
                shiftKey: false,
                key: 'z',
                hasSelectedNode: false,
                canRedo: false,
            }),
        ).toBeNull();
    });
});

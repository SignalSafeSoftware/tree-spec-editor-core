import { describe, expect, it } from 'vitest';

import type { EditorTree } from '../../src/model';
import {
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
} from '../../src/lib/editorHistory';

function sampleTree(prompt = 'A'): EditorTree {
    return {
        start_node: 'n1',
        nodes: {
            n1: { id: 'n1', type: 'prompt', prompt, choices: [{ id: 'c1', label: 'Go' }] },
        },
        transitions: [],
    };
}

describe('editorHistory', () => {
    it('tracks undo/redo availability', () => {
        const stack = createEditorHistoryStack();
        expect(canUndoEditorHistory(stack)).toBe(false);
        expect(canRedoEditorHistory(stack)).toBe(false);

        pushEditorHistory(stack, sampleTree('A'));
        expect(canUndoEditorHistory(stack)).toBe(true);

        const undo = popEditorUndo(stack, sampleTree('B'));
        expect(undo?.nextTree.nodes.n1?.prompt).toBe('A');
        stack.future.unshift(undo!.currentSnapshot);
        expect(canRedoEditorHistory(stack)).toBe(true);
    });

    it('clears redo entries when a new edit is pushed', () => {
        const stack = createEditorHistoryStack();
        pushEditorHistory(stack, sampleTree('A'));
        const undo = popEditorUndo(stack, sampleTree('B'));
        stack.future.unshift(undo!.currentSnapshot);
        expect(canRedoEditorHistory(stack)).toBe(true);

        pushEditorHistory(stack, sampleTree('B'));
        expect(canRedoEditorHistory(stack)).toBe(false);
    });

    it('supports redo after undo', () => {
        const stack = createEditorHistoryStack();
        pushEditorHistory(stack, sampleTree('A'));
        const undo = popEditorUndo(stack, sampleTree('B'));
        stack.future.unshift(undo!.currentSnapshot);

        const redo = popEditorRedo(stack, undo!.nextTree);
        expect(redo?.nextTree.nodes.n1?.prompt).toBe('B');
    });

    it('cloneEditorTree and editorTreesEqual round-trip', () => {
        const tree = sampleTree('Same');
        const clone = cloneEditorTree(tree);
        expect(editorTreesEqual(tree, clone)).toBe(true);
        clone.nodes.n1!.prompt = 'Changed';
        expect(editorTreesEqual(tree, clone)).toBe(false);
    });

    it('clearEditorHistory resets both stacks', () => {
        const stack = createEditorHistoryStack();
        pushEditorHistory(stack, sampleTree());
        clearEditorHistory(stack);
        expect(canUndoEditorHistory(stack)).toBe(false);
        expect(canRedoEditorHistory(stack)).toBe(false);
    });

    it('trims undo stack to MAX_EDITOR_HISTORY entries', () => {
        const stack = createEditorHistoryStack();

        for (let i = 0; i < MAX_EDITOR_HISTORY + 5; i += 1) {
            pushEditorHistory(stack, sampleTree(`tree-${i}`));
        }

        expect(stack.past).toHaveLength(MAX_EDITOR_HISTORY);
        expect(stack.past[0]?.nodes.n1?.prompt).toBe('tree-5');
        expect(stack.past[MAX_EDITOR_HISTORY - 1]?.nodes.n1?.prompt).toBe(`tree-${MAX_EDITOR_HISTORY + 4}`);
    });
});

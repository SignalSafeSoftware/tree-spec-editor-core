import type { EditorTree } from '../model';

/** Maximum undo steps retained in memory. */
export const MAX_EDITOR_HISTORY = 50;

export interface EditorHistoryStack {
    past: EditorTree[];
    future: EditorTree[];
}

export function createEditorHistoryStack(): EditorHistoryStack {
    return { past: [], future: [] };
}

/** Deep-clone an editor tree for history snapshots. */
export function cloneEditorTree(tree: EditorTree): EditorTree {
    return structuredClone(tree);
}

export function editorTreesEqual(a: EditorTree, b: EditorTree): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

export function canUndoEditorHistory(stack: EditorHistoryStack): boolean {
    return stack.past.length > 0;
}

export function canRedoEditorHistory(stack: EditorHistoryStack): boolean {
    return stack.future.length > 0;
}

export function clearEditorHistory(stack: EditorHistoryStack): void {
    stack.past.length = 0;
    stack.future.length = 0;
}

/** Record `priorTree` on the undo stack and discard redo entries. */
export function pushEditorHistory(stack: EditorHistoryStack, priorTree: EditorTree): void {
    stack.past.push(cloneEditorTree(priorTree));
    if (stack.past.length > MAX_EDITOR_HISTORY) {
        stack.past.shift();
    }
    stack.future.length = 0;
}

/**
 * Pop the latest undo snapshot. Returns `{ nextTree, currentSnapshot }` where
 * `currentSnapshot` should be pushed onto the redo stack by the caller.
 */
export function popEditorUndo(
    stack: EditorHistoryStack,
    currentTree: EditorTree,
): { nextTree: EditorTree; currentSnapshot: EditorTree } | null {
    const prior = stack.past.pop();
    if (!prior) return null;
    return {
        nextTree: prior,
        currentSnapshot: cloneEditorTree(currentTree),
    };
}

/**
 * Pop the latest redo snapshot. Returns `{ nextTree, currentSnapshot }` where
 * `currentSnapshot` should be pushed onto the undo stack by the caller.
 */
export function popEditorRedo(
    stack: EditorHistoryStack,
    currentTree: EditorTree,
): { nextTree: EditorTree; currentSnapshot: EditorTree } | null {
    const next = stack.future.shift();
    if (!next) return null;
    return {
        nextTree: next,
        currentSnapshot: cloneEditorTree(currentTree),
    };
}

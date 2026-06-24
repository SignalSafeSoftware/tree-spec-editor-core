import { readGraphEditorMeta, writeGraphEditorMeta, type GraphEditorMeta, type GraphEditorViewport } from '@signalsafe/tree-spec';

import { type EditorTree } from '../model.js';

/** Fallback END position when nothing is saved and nodes lack layout. */
export const LEGACY_DEFAULT_END_POSITION = { x: 700, y: 0 };

const END_COLUMN_OFFSET = 420;

/** Place END one column to the right of the rightmost node. */
export function computeDefaultEndPosition(tree: EditorTree): { x: number; y: number } {
    const nodes = Object.values(tree.nodes);
    if (nodes.length === 0) return LEGACY_DEFAULT_END_POSITION;

    let maxX = 60;
    let sumY = 0;
    for (const node of nodes) {
        const x = node.position?.x ?? 0;
        const y = node.position?.y ?? 0;
        if (x > maxX) maxX = x;
        sumY += y;
    }

    return { x: maxX + END_COLUMN_OFFSET, y: sumY / nodes.length };
}

export function resolveEndNodePosition(tree: EditorTree): { x: number; y: number } {
    const saved = readGraphEditorMeta(tree._meta).end_position;
    return saved ?? computeDefaultEndPosition(tree);
}

export function resolveGraphViewport(tree: EditorTree): GraphEditorViewport | undefined {
    return readGraphEditorMeta(tree._meta).viewport;
}

export function patchGraphEditorMeta(tree: EditorTree, patch: Partial<GraphEditorMeta>): EditorTree {
    return {
        ...tree,
        _meta: writeGraphEditorMeta(tree._meta, patch),
    };
}

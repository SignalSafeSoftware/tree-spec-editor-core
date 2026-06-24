import { TERMINAL_OUTCOME } from '@signalsafe/tree-spec';

import { END_NODE_ID, type EditorTree, type EditorTransition } from '../model.js';
import { getTransition, safeUUID, upsertTransition } from './editorHelpers.js';

/** Minimal connection shape shared by React Flow connect/reconnect handlers. */
export type EditorConnection = {
    source: string | null;
    target: string | null;
    sourceHandle?: string | null;
    targetHandle?: string | null;
};

/** Parse a React Flow source handle id into a choice id (`choice:{id}` → `{id}`). */
export function choiceIdFromHandle(handle: string | null | undefined): string {
    if (!handle) return '';
    if (handle.startsWith('choice:')) return handle.slice('choice:'.length);
    return handle;
}

/** True when the connection can be applied to the editor tree. */
export function isValidEditorConnection(tree: EditorTree, conn: EditorConnection): boolean {
    const { source, target, sourceHandle, targetHandle } = conn;
    if (!source || !target) return false;
    if (source === END_NODE_ID) return false;
    if (source === target) return false;

    const choiceId = choiceIdFromHandle(sourceHandle);
    if (!choiceId) return false;

    const sourceNode = tree.nodes[source];
    if (!sourceNode) return false;
    if (!(sourceNode.choices ?? []).some((c) => c.id === choiceId)) return false;

    if (target !== END_NODE_ID && !tree.nodes[target]) return false;

    if (targetHandle != null && targetHandle !== '' && targetHandle !== 'in') return false;

    return true;
}

/** Upsert a transition for a new canvas connection (replaces any existing edge for the same choice). */
export function applyEditorConnect(tree: EditorTree, conn: EditorConnection): EditorTree | null {
    if (!isValidEditorConnection(tree, conn)) return null;

    const choiceId = choiceIdFromHandle(conn.sourceHandle);
    const source = String(conn.source);
    const target = String(conn.target);
    const existing = getTransition(tree, source, choiceId);

    const next: EditorTransition = {
        id: existing?.id ?? safeUUID(),
        fromNodeId: source,
        fromChoiceId: choiceId,
        toNodeId: target,
        outcome:
            target === END_NODE_ID
                ? (existing?.outcome ?? TERMINAL_OUTCOME.AT_RISK)
                : undefined,
    };

    return upsertTransition(tree, next);
}

/** Update only the target of an existing transition (target-only reconnect). */
export function applyEditorReconnect(
    tree: EditorTree,
    oldEdge: { id: string; source: string; sourceHandle?: string | null; target: string },
    newConnection: EditorConnection,
): EditorTree | null {
    const choiceId = choiceIdFromHandle(oldEdge.sourceHandle);
    if (!choiceId) return null;
    if (newConnection.source && newConnection.source !== oldEdge.source) return null;

    const conn: EditorConnection = {
        source: oldEdge.source,
        target: newConnection.target,
        sourceHandle: oldEdge.sourceHandle,
        targetHandle: newConnection.targetHandle ?? 'in',
    };
    if (!isValidEditorConnection(tree, conn)) return null;

    const existing = tree.transitions.find((t) => t.id === oldEdge.id);
    if (!existing) return null;

    const target = String(newConnection.target);
    const next: EditorTransition = {
        ...existing,
        toNodeId: target,
        outcome:
            target === END_NODE_ID
                ? (existing.outcome ?? TERMINAL_OUTCOME.AT_RISK)
                : undefined,
    };

    return upsertTransition(tree, next);
}

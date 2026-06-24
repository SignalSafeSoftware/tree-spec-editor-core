import { END_NODE_ID, type EditorNode, type EditorTree, type EditorTransition } from '../model.js';
import { DEFAULT_GRAPH_NODE_WIDTH } from './nodeHints.js';
import { getTransition, safeUUID, upsertTransition } from './editorHelpers.js';
import { DEFAULT_NODE_LAYOUT_HEIGHT, snapPosition } from './treeLayout.js';
import { choiceIdFromHandle } from './connectionValidation.js';

export type AppendChoiceTemplateInput = {
    choices: ReadonlyArray<{ label: string; id?: string }>;
};

export type ConnectOnDropOptions = {
    nodeType?: string;
    prompt?: string;
    nodeWidth?: number;
    nodeHeight?: number;
};

/**
 * Spawn a node at `dropPosition` and connect the dragged choice handle to it.
 * Used when a connection line is dropped on empty canvas space.
 */
export function applyEditorConnectOnDrop(
    tree: EditorTree,
    source: string,
    sourceHandle: string | null | undefined,
    dropPosition: { x: number; y: number },
    options?: ConnectOnDropOptions,
): { nextTree: EditorTree; nextNodeId: string } | null {
    if (source === END_NODE_ID) return null;

    const choiceId = choiceIdFromHandle(sourceHandle);
    if (!choiceId) return null;

    const sourceNode = tree.nodes[source];
    if (!sourceNode) return null;
    if (!(sourceNode.choices ?? []).some((choice) => choice.id === choiceId)) return null;

    const nodeWidth = options?.nodeWidth ?? DEFAULT_GRAPH_NODE_WIDTH;
    const nodeHeight = options?.nodeHeight ?? DEFAULT_NODE_LAYOUT_HEIGHT;
    const nextNodeId = `n_${safeUUID().slice(0, 8)}`;
    const position = snapPosition({
        x: dropPosition.x - nodeWidth / 2,
        y: dropPosition.y - nodeHeight / 2,
    });

    const nextNode: EditorNode = {
        id: nextNodeId,
        type: options?.nodeType ?? 'prompt',
        prompt: options?.prompt ?? '',
        choices: [],
        position,
    };

    const existing = getTransition(tree, source, choiceId);
    const transition: EditorTransition = {
        id: existing?.id ?? safeUUID(),
        fromNodeId: source,
        fromChoiceId: choiceId,
        toNodeId: nextNodeId,
        outcome: undefined,
    };

    const nextTree = upsertTransition(
        {
            ...tree,
            nodes: { ...tree.nodes, [nextNodeId]: nextNode },
        },
        transition,
    );

    return { nextTree, nextNodeId };
}

/** Append template choices (with fresh ids) onto an existing node. */
export function appendChoiceTemplate(
    tree: EditorTree,
    nodeId: string,
    template: AppendChoiceTemplateInput,
): EditorTree | null {
    if (nodeId === END_NODE_ID) return null;
    const node = tree.nodes[nodeId];
    if (!node) return null;
    if (template.choices.length === 0) return null;

    const appended = template.choices.map((choice) => ({
        id: choice.id?.trim() || `c_${safeUUID().slice(0, 6)}`,
        label: choice.label,
    }));

    return {
        ...tree,
        nodes: {
            ...tree.nodes,
            [nodeId]: {
                ...node,
                choices: [...(node.choices ?? []), ...appended],
            },
        },
    };
}

import { END_NODE_ID, type EditorChoice, type EditorTree } from '../model.js';

export type MoveNodeChoiceDirection = 'up' | 'down';

/** Swap a choice one position up or down within its node's choice list. */
export function moveNodeChoice(
    choices: ReadonlyArray<EditorChoice>,
    choiceId: string,
    direction: MoveNodeChoiceDirection,
): EditorChoice[] | null {
    const list = [...choices];
    const index = list.findIndex((choice) => choice.id === choiceId);
    if (index < 0) return null;
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= list.length) return null;
    const current = list[index];
    const target = list[swapWith];
    if (current === undefined || target === undefined) return null;
    list[index] = target;
    list[swapWith] = current;
    return list;
}

function reorderChoicesAtIndex(
    choices: ReadonlyArray<EditorChoice>,
    fromIndex: number,
    toIndex: number,
): EditorChoice[] {
    const next = [...choices];
    const removed = next.splice(fromIndex, 1);
    const item = removed[0];
    if (item === undefined) return next;
    const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
    next.splice(insertAt, 0, item);
    return next;
}

/**
 * Move a choice within a node or to another node at `toIndex` (0-based insert position).
 * Outgoing transitions for the choice follow it to the new parent node.
 */
export function moveChoiceInTree(
    tree: EditorTree,
    fromNodeId: string,
    choiceId: string,
    toNodeId: string,
    toIndex: number,
): EditorTree | null {
    if (fromNodeId === END_NODE_ID || toNodeId === END_NODE_ID) return null;

    const fromNode = tree.nodes[fromNodeId];
    const toNode = tree.nodes[toNodeId];
    if (!fromNode || !toNode) return null;

    const fromChoices = [...(fromNode.choices ?? [])];
    const fromIndex = fromChoices.findIndex((choice) => choice.id === choiceId);
    if (fromIndex < 0) return null;

    if (fromNodeId === toNodeId) {
        const clampedIndex = Math.max(0, Math.min(toIndex, fromChoices.length - 1));
        if (clampedIndex === fromIndex) return null;
        const reordered = reorderChoicesAtIndex(fromChoices, fromIndex, clampedIndex);
        return {
            ...tree,
            nodes: {
                ...tree.nodes,
                [fromNodeId]: { ...fromNode, choices: reordered },
            },
        };
    }

    const [movedChoice] = fromChoices.splice(fromIndex, 1);
    if (!movedChoice) return null;

    const toChoices = [...(toNode.choices ?? [])];
    const insertIndex = Math.max(0, Math.min(toIndex, toChoices.length));
    toChoices.splice(insertIndex, 0, movedChoice);

    const transitions = tree.transitions.map((transition) =>
        transition.fromNodeId === fromNodeId && transition.fromChoiceId === choiceId
            ? { ...transition, fromNodeId: toNodeId }
            : transition,
    );

    return {
        ...tree,
        nodes: {
            ...tree.nodes,
            [fromNodeId]: { ...fromNode, choices: fromChoices },
            [toNodeId]: { ...toNode, choices: toChoices },
        },
        transitions,
    };
}

/** Rename a choice id on a node and update its outgoing transitions. */
export function renameNodeChoiceId(
    tree: EditorTree,
    nodeId: string,
    oldChoiceId: string,
    newChoiceId: string,
): EditorTree | null {
    const trimmed = newChoiceId.trim();
    if (!trimmed || trimmed === oldChoiceId) return null;
    if (nodeId === END_NODE_ID) return null;

    const node = tree.nodes[nodeId];
    if (!node) return null;

    const choices = node.choices ?? [];
    if (!choices.some((choice) => choice.id === oldChoiceId)) return null;
    if (choices.some((choice) => choice.id === trimmed)) return null;

    const nextChoices = choices.map((choice) =>
        choice.id === oldChoiceId ? { ...choice, id: trimmed } : choice,
    );
    const nextTransitions = tree.transitions.map((transition) =>
        transition.fromNodeId === nodeId && transition.fromChoiceId === oldChoiceId
            ? { ...transition, fromChoiceId: trimmed }
            : transition,
    );

    return {
        ...tree,
        nodes: {
            ...tree.nodes,
            [nodeId]: { ...node, choices: nextChoices },
        },
        transitions: nextTransitions,
    };
}

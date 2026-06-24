import type { EditorTree, EditorTransition } from '../model.js';

export function getTransition(
    tree: EditorTree,
    fromNodeId: string,
    fromChoiceId: string,
): EditorTransition | undefined {
    return tree.transitions.find((t) => t.fromNodeId === fromNodeId && t.fromChoiceId === fromChoiceId);
}

export function upsertTransition(tree: EditorTree, next: EditorTransition): EditorTree {
    const idx = tree.transitions.findIndex((t) => t.id === next.id);
    const arr = [...tree.transitions];
    if (idx >= 0) arr[idx] = next;
    else arr.push(next);
    return { ...tree, transitions: arr };
}

export function deleteTransitionsForChoice(
    tree: EditorTree,
    fromNodeId: string,
    fromChoiceId: string,
): EditorTree {
    return {
        ...tree,
        transitions: tree.transitions.filter(
            (t) => !(t.fromNodeId === fromNodeId && t.fromChoiceId === fromChoiceId),
        ),
    };
}

import type { TerminalOutcome } from '@signalsafe/tree-spec';

import { newEditorChoiceId, newEditorNodeId, safeUUID } from './editorHelpers.js';
import { getNextSpawnPosition } from './treeLayout.js';
import { END_NODE_ID, type EditorChoice, type EditorNode, type EditorTree, type EditorTransition } from '../model.js';

export interface TreeTemplateNodeSpec {
    type: string;
    prompt: string;
    choices: EditorChoice[];
    offset?: { x: number; y: number };
}

export interface TreeTemplateTransitionSpec {
    fromSlot: string;
    fromChoiceId: string;
    toSlot: string;
    outcome?: TerminalOutcome;
}

export interface TreeTemplateSpec {
    focusSlot: string;
    nodes: Record<string, TreeTemplateNodeSpec>;
    transitions: TreeTemplateTransitionSpec[];
}

export interface ApplyTreeTemplateOptions {
    basePosition?: { x: number; y: number };
}

export interface TreeDiffSummary {
    lines: string[];
    hasChanges: boolean;
}

function transitionSignature(t: EditorTransition): string {
    const outcome = t.outcome ?? '';
    return `${t.fromNodeId}:${t.fromChoiceId}->${t.toNodeId}:${outcome}`;
}

function countSetDiff<T>(before: Set<T>, after: Set<T>): { added: number; removed: number } {
    let added = 0;
    for (const value of after) {
        if (!before.has(value)) added += 1;
    }
    let removed = 0;
    for (const value of before) {
        if (!after.has(value)) removed += 1;
    }
    return { added, removed };
}

function countSharedNodeContentChanges(
    before: EditorTree,
    after: EditorTree,
    sharedNodeIds: Iterable<string>,
): { typeOrPromptChanges: number; choiceChanges: number } {
    let typeOrPromptChanges = 0;
    let choiceChanges = 0;
    for (const id of sharedNodeIds) {
        const b = before.nodes[id];
        const a = after.nodes[id];
        if (!b || !a) continue;
        if (b.type !== a.type || b.prompt !== a.prompt) typeOrPromptChanges += 1;
        const bChoices = JSON.stringify(b.choices ?? []);
        const aChoices = JSON.stringify(a.choices ?? []);
        if (bChoices !== aChoices) choiceChanges += 1;
    }
    return { typeOrPromptChanges, choiceChanges };
}

function buildNodesFromTemplate(
    tree: EditorTree,
    spec: TreeTemplateSpec,
    base: { x: number; y: number },
): { nodes: Record<string, EditorNode>; slotToId: Map<string, string>; focusNodeId: string } {
    const nodes: Record<string, EditorNode> = { ...tree.nodes };
    const slotToId = new Map<string, string>();
    let focusNodeId = '';
    for (const [slot, nodeSpec] of Object.entries(spec.nodes)) {
        const id = newEditorNodeId();
        slotToId.set(slot, id);
        if (slot === spec.focusSlot) focusNodeId = id;
        const offset = nodeSpec.offset ?? { x: 0, y: 0 };
        nodes[id] = {
            id,
            type: nodeSpec.type,
            prompt: nodeSpec.prompt,
            choices: nodeSpec.choices.map((c) => ({ ...c })),
            position: { x: base.x + offset.x, y: base.y + offset.y },
        };
    }
    return { nodes, slotToId, focusNodeId };
}

function resolveTemplateTransitionEndpoints(
    tr: TreeTemplateTransitionSpec,
    slotToId: ReadonlyMap<string, string>,
): { fromNodeId: string; toNodeId: string } {
    const fromNodeId = slotToId.get(tr.fromSlot);
    if (fromNodeId === undefined) {
        throw new Error(`Unknown fromSlot "${tr.fromSlot}" in template transition`);
    }
    if (tr.toSlot === END_NODE_ID) {
        return { fromNodeId, toNodeId: END_NODE_ID };
    }
    const toNodeId = slotToId.get(tr.toSlot);
    if (toNodeId === undefined) {
        throw new Error(`unknown slot "${tr.toSlot}" in template transition`);
    }
    return { fromNodeId, toNodeId };
}

function appendTemplateTransitions(
    spec: TreeTemplateSpec,
    slotToId: ReadonlyMap<string, string>,
    transitions: EditorTransition[],
): EditorTransition[] {
    const next = [...transitions];
    for (const tr of spec.transitions) {
        const { fromNodeId, toNodeId } = resolveTemplateTransitionEndpoints(tr, slotToId);
        next.push({
            id: safeUUID(),
            fromNodeId,
            fromChoiceId: tr.fromChoiceId,
            toNodeId,
            outcome: tr.outcome,
        });
    }
    return next;
}

export function duplicateNode(
    tree: EditorTree,
    nodeId: string,
): { nextTree: EditorTree; nextNodeId: string } | null {
    if (nodeId === END_NODE_ID) return null;
    const src = tree.nodes[nodeId];
    if (!src) return null;

    const nextNodeId = newEditorNodeId();
    const choices = (src.choices ?? []).map((c) => ({
        ...c,
        id: newEditorChoiceId(),
    }));
    const pos = src.position ?? { x: 0, y: 0 };
    const nextNode: EditorNode = {
        ...src,
        id: nextNodeId,
        choices,
        position: { x: pos.x + 40, y: pos.y + 40 },
    };

    return {
        nextTree: { ...tree, nodes: { ...tree.nodes, [nextNodeId]: nextNode } },
        nextNodeId,
    };
}

export function deleteNode(tree: EditorTree, nodeId: string): EditorTree | null {
    if (nodeId === END_NODE_ID) return null;
    if (!tree.nodes[nodeId]) return null;

    const originalStart = tree.start_node;
    const nodes = { ...tree.nodes };
    delete nodes[nodeId];

    const transitions = tree.transitions.filter(
        (t) => t.fromNodeId !== nodeId && t.toNodeId !== nodeId,
    );

    let start_node = tree.start_node;
    if (start_node === nodeId) {
        const remaining = Object.keys(nodes);
        start_node = remaining[0] ?? originalStart;
    }

    return { ...tree, nodes, transitions, start_node };
}

export function computeTreeDiffSummary(
    before: EditorTree | null,
    after: EditorTree,
): TreeDiffSummary {
    if (!before) {
        return {
            lines: ['(No baseline available for diff)'],
            hasChanges: true,
        };
    }

    const beforeIds = new Set(Object.keys(before.nodes));
    const afterIds = new Set(Object.keys(after.nodes));
    const { added: nodesAdded, removed: nodesRemoved } = countSetDiff(beforeIds, afterIds);

    const sharedNodeIds = [...afterIds].filter((id) => beforeIds.has(id));
    const { typeOrPromptChanges, choiceChanges } = countSharedNodeContentChanges(before, after, sharedNodeIds);

    const beforeTr = new Set(before.transitions.map(transitionSignature));
    const afterTr = new Set(after.transitions.map(transitionSignature));
    const { added: transitionsAdded, removed: transitionsRemoved } = countSetDiff(beforeTr, afterTr);

    const lines: string[] = [];
    if (nodesAdded > 0) lines.push(`Nodes added: ${nodesAdded}`);
    if (nodesRemoved > 0) lines.push(`Nodes removed: ${nodesRemoved}`);
    if (typeOrPromptChanges > 0) lines.push(`Nodes updated (type/prompt): ${typeOrPromptChanges}`);
    if (choiceChanges > 0) lines.push(`Nodes updated (choices): ${choiceChanges}`);
    if (transitionsAdded > 0) lines.push(`Transitions added/changed: ${transitionsAdded}`);
    if (transitionsRemoved > 0) lines.push(`Transitions removed/changed: ${transitionsRemoved}`);

    if (lines.length === 0) {
        return { lines: ['No semantic changes detected.'], hasChanges: false };
    }
    return { lines, hasChanges: true };
}

export function applyTreeTemplate(
    tree: EditorTree,
    spec: TreeTemplateSpec,
    options?: ApplyTreeTemplateOptions,
): { nextTree: EditorTree; focusNodeId: string } {
    if (!Object.hasOwn(spec.nodes, spec.focusSlot)) {
        throw new Error(`focusSlot "${spec.focusSlot}" is not defined in spec.nodes`);
    }

    const base = options?.basePosition ?? { x: 0, y: getNextSpawnPosition(tree).y };
    const { nodes, slotToId, focusNodeId } = buildNodesFromTemplate(tree, spec, base);
    const transitions = appendTemplateTransitions(spec, slotToId, tree.transitions);

    const start_node = tree.start_node || focusNodeId;

    return {
        nextTree: { start_node, nodes, transitions },
        focusNodeId,
    };
}

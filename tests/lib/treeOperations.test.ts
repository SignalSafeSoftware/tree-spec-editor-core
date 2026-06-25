import { afterEach, describe, expect, it, vi } from 'vitest';
import { END_NODE_ID, type EditorTree } from '../../src/model';
import {
    applyTreeTemplate,
    computeTreeDiffSummary,
    deleteNode,
    duplicateNode,
    type TreeTemplateSpec,
} from '../../src/lib/treeOperations';
import * as editorHelpers from '../../src/lib/editorHelpers';

function createTree(): EditorTree {
    return {
        start_node: 'start',
        nodes: {
            start: {
                id: 'start',
                type: 'prompt',
                prompt: 'Start prompt',
                choices: [
                    { id: 'go', label: 'Go' },
                    { id: 'stop', label: 'Stop' },
                ],
                position: { x: 10, y: 20 },
            },
            beta: {
                id: 'beta',
                type: 'email',
                prompt: 'Beta',
                choices: [{ id: 'finish', label: 'Finish' }],
                position: { x: 100, y: 200 },
            },
        },
        transitions: [
            { id: 't1', fromNodeId: 'start', fromChoiceId: 'go', toNodeId: 'beta' },
            { id: 't2', fromNodeId: 'start', fromChoiceId: 'stop', toNodeId: END_NODE_ID, outcome: 'safe' },
            { id: 't3', fromNodeId: 'beta', fromChoiceId: 'finish', toNodeId: END_NODE_ID, outcome: 'compromised' },
        ],
    };
}

describe('duplicateNode', () => {
    it('returns null for the synthetic END node', () => {
        expect(duplicateNode(createTree(), END_NODE_ID)).toBeNull();
    });

    it('returns null when the node id is unknown', () => {
        expect(duplicateNode(createTree(), 'missing-node-id')).toBeNull();
    });

    it('produces a fresh node id, fresh choice ids, and an offset position', () => {
        const tree = createTree();
        const result = duplicateNode(tree, 'start');
        expect(result).not.toBeNull();
        const { nextTree, nextNodeId } = result!;

        expect(nextNodeId).not.toBe('start');
        expect(nextNodeId.startsWith('n_')).toBe(true);

        const original = tree.nodes.start;
        const clone = nextTree.nodes[nextNodeId];
        expect(clone.type).toBe(original.type);
        expect(clone.prompt).toBe(original.prompt);
        expect(clone.position).toEqual({ x: 50, y: 60 });

        expect(clone.choices).toHaveLength(original.choices.length);
        const originalChoiceIds = new Set(original.choices.map((c) => c.id));
        for (const choice of clone.choices) {
            expect(choice.id.startsWith('c_')).toBe(true);
            expect(originalChoiceIds.has(choice.id)).toBe(false);
        }
        expect(clone.choices.map((c) => c.label)).toEqual(
            original.choices.map((c) => c.label),
        );
    });

    it('does not duplicate transitions (clone is intentionally orphaned)', () => {
        const tree = createTree();
        const { nextTree } = duplicateNode(tree, 'start')!;
        expect(nextTree.transitions).toEqual(tree.transitions);
    });

    it('returns a new tree object without mutating the source', () => {
        const tree = createTree();
        const { nextTree } = duplicateNode(tree, 'start')!;
        expect(nextTree).not.toBe(tree);
        expect(nextTree.nodes).not.toBe(tree.nodes);
        expect(tree.nodes.start.position).toEqual({ x: 10, y: 20 });
    });
});

describe('deleteNode', () => {
    it('returns null for the synthetic END node', () => {
        expect(deleteNode(createTree(), END_NODE_ID)).toBeNull();
    });

    it('returns null when the node id is unknown', () => {
        expect(deleteNode(createTree(), 'nope')).toBeNull();
    });

    it('removes the node and any transitions referencing it as endpoint', () => {
        const tree = createTree();
        const nextTree = deleteNode(tree, 'beta')!;
        expect(Object.keys(nextTree.nodes)).toEqual(['start']);
        const remaining = nextTree.transitions.map((t) => t.id);
        expect(remaining).toEqual(['t2']);
    });

    it('keeps start_node when the deleted node was not the start', () => {
        const tree = createTree();
        const nextTree = deleteNode(tree, 'beta')!;
        expect(nextTree.start_node).toBe('start');
    });

    it('reassigns start_node to the first remaining node when start is deleted', () => {
        const tree = createTree();
        const nextTree = deleteNode(tree, 'start')!;
        expect(nextTree.start_node).toBe('beta');
    });

    it('falls back to the original start_node when the tree becomes empty', () => {
        const tree: EditorTree = {
            start_node: 'only',
            nodes: {
                only: {
                    id: 'only',
                    type: 'prompt',
                    prompt: 'Only',
                    choices: [],
                    position: { x: 0, y: 0 },
                },
            },
            transitions: [],
        };
        const nextTree = deleteNode(tree, 'only')!;
        expect(Object.keys(nextTree.nodes)).toEqual([]);
        expect(nextTree.start_node).toBe('only');
    });
});

describe('computeTreeDiffSummary', () => {
    it('reports a baseline-missing notice when before is null', () => {
        const after = createTree();
        const summary = computeTreeDiffSummary(null, after);
        expect(summary.hasChanges).toBe(true);
        expect(summary.lines).toEqual(['(No baseline available for diff)']);
    });

    it('reports no semantic changes when trees are structurally equal', () => {
        const before = createTree();
        const after = createTree();
        const summary = computeTreeDiffSummary(before, after);
        expect(summary.hasChanges).toBe(false);
        expect(summary.lines).toEqual(['No semantic changes detected.']);
    });

    it('reports node add/remove counts', () => {
        const before = createTree();
        const after: EditorTree = {
            ...before,
            nodes: {
                ...Object.fromEntries(
                    Object.entries(before.nodes).filter(([id]) => id !== 'beta'),
                ),
                gamma: {
                    id: 'gamma',
                    type: 'prompt',
                    prompt: 'Gamma',
                    choices: [],
                    position: { x: 0, y: 0 },
                },
            },
        };
        const summary = computeTreeDiffSummary(before, after);
        expect(summary.hasChanges).toBe(true);
        expect(summary.lines).toContain('Nodes added: 1');
        expect(summary.lines).toContain('Nodes removed: 1');
    });

    it('counts prompt/type changes and choice changes separately', () => {
        const before = createTree();
        const after = createTree();
        after.nodes.start = { ...after.nodes.start, prompt: 'Updated prompt' };
        after.nodes.beta = {
            ...after.nodes.beta,
            choices: [
                ...after.nodes.beta.choices,
                { id: 'cancel', label: 'Cancel' },
            ],
        };
        const summary = computeTreeDiffSummary(before, after);
        expect(summary.lines).toContain('Nodes updated (type/prompt): 1');
        expect(summary.lines).toContain('Nodes updated (choices): 1');
    });

    it('counts type-only changes under type/prompt updates', () => {
        const before = createTree();
        const after = createTree();
        after.nodes.start = { ...after.nodes.start, type: 'email' };
        const summary = computeTreeDiffSummary(before, after);
        expect(summary.hasChanges).toBe(true);
        expect(summary.lines).toEqual(['Nodes updated (type/prompt): 1']);
    });

    it('counts transition additions and removals via from:choice->to:outcome keys', () => {
        const before = createTree();
        const after: EditorTree = {
            ...before,
            transitions: [
                ...before.transitions.filter((t) => t.id !== 't1'),
                {
                    id: 'tNew',
                    fromNodeId: 'start',
                    fromChoiceId: 'go',
                    toNodeId: END_NODE_ID,
                    outcome: 'at_risk',
                },
            ],
        };
        const summary = computeTreeDiffSummary(before, after);
        expect(summary.lines).toContain('Transitions added/changed: 1');
        expect(summary.lines).toContain('Transitions removed/changed: 1');
    });
});

describe('applyTreeTemplate', () => {
    function makeSpec(): TreeTemplateSpec {
        return {
            focusSlot: 'focus',
            nodes: {
                focus: {
                    type: 'call',
                    prompt: 'Focus prompt',
                    choices: [
                        { id: 'comply', label: 'Comply' },
                        { id: 'verify', label: 'Verify' },
                    ],
                    offset: { x: 60, y: 0 },
                },
                verify: {
                    type: 'prompt',
                    prompt: 'Verify prompt',
                    choices: [
                        { id: 'callback', label: 'Callback' },
                        { id: 'reply', label: 'Reply' },
                    ],
                    offset: { x: 420, y: 0 },
                },
            },
            transitions: [
                { fromSlot: 'focus', fromChoiceId: 'comply', toSlot: END_NODE_ID, outcome: 'compromised' },
                { fromSlot: 'focus', fromChoiceId: 'verify', toSlot: 'verify' },
                { fromSlot: 'verify', fromChoiceId: 'callback', toSlot: END_NODE_ID, outcome: 'safe' },
                { fromSlot: 'verify', fromChoiceId: 'reply', toSlot: END_NODE_ID, outcome: 'at_risk' },
            ],
        };
    }

    it('generates fresh node ids per slot and returns the focus node id', () => {
        const tree = createTree();
        const result = applyTreeTemplate(tree, makeSpec());
        expect(result.focusNodeId).toBeDefined();
        expect(result.focusNodeId.startsWith('n_')).toBe(true);
        const insertedIds = Object.keys(result.nextTree.nodes).filter(
            (id) => !tree.nodes[id],
        );
        expect(insertedIds).toHaveLength(2);
        expect(insertedIds).toContain(result.focusNodeId);
        for (const id of insertedIds) {
            expect(id.startsWith('n_')).toBe(true);
        }
    });

    it('preserves the original tree nodes and transitions', () => {
        const tree = createTree();
        const result = applyTreeTemplate(tree, makeSpec());
        for (const [id, node] of Object.entries(tree.nodes)) {
            expect(result.nextTree.nodes[id]).toBe(node);
        }
        for (const transition of tree.transitions) {
            expect(result.nextTree.transitions).toContain(transition);
        }
    });

    it('resolves internal slot references and END_NODE_ID in transitions', () => {
        const tree = createTree();
        const { nextTree, focusNodeId } = applyTreeTemplate(tree, makeSpec());
        const verifyNodeId = Object.keys(nextTree.nodes).find(
            (id) => !tree.nodes[id] && id !== focusNodeId,
        )!;
        const focusTransitions = nextTree.transitions.filter(
            (t) => t.fromNodeId === focusNodeId,
        );
        expect(focusTransitions).toHaveLength(2);
        const verifyEdge = focusTransitions.find((t) => t.fromChoiceId === 'verify');
        expect(verifyEdge?.toNodeId).toBe(verifyNodeId);
        const complyEdge = focusTransitions.find((t) => t.fromChoiceId === 'comply');
        expect(complyEdge?.toNodeId).toBe(END_NODE_ID);
        expect(complyEdge?.outcome).toBe('compromised');
    });

    it('positions each node at basePosition + offset (default base = { x: 0, y: getNextSpawnPosition.y })', () => {
        const tree = createTree();
        const expectedBaseY = 80 + Object.keys(tree.nodes).length * 44;
        const { nextTree, focusNodeId } = applyTreeTemplate(tree, makeSpec());
        expect(nextTree.nodes[focusNodeId].position).toEqual({ x: 60, y: expectedBaseY });
        const verifyNodeId = Object.keys(nextTree.nodes).find(
            (id) => !tree.nodes[id] && id !== focusNodeId,
        )!;
        expect(nextTree.nodes[verifyNodeId].position).toEqual({ x: 420, y: expectedBaseY });
    });

    it('honors an explicit basePosition option', () => {
        const tree = createTree();
        const { nextTree, focusNodeId } = applyTreeTemplate(tree, makeSpec(), {
            basePosition: { x: 1000, y: 500 },
        });
        expect(nextTree.nodes[focusNodeId].position).toEqual({ x: 1060, y: 500 });
    });

    it('uses the focus node id as start_node when the original tree had no start_node', () => {
        const empty: EditorTree = { start_node: '', nodes: {}, transitions: [] };
        const { nextTree, focusNodeId } = applyTreeTemplate(empty, makeSpec());
        expect(nextTree.start_node).toBe(focusNodeId);
    });

    it('preserves start_node when the original tree had one', () => {
        const tree = createTree();
        const { nextTree } = applyTreeTemplate(tree, makeSpec());
        expect(nextTree.start_node).toBe('start');
    });

    it('throws when focusSlot does not match any node', () => {
        const tree = createTree();
        const broken: TreeTemplateSpec = { ...makeSpec(), focusSlot: 'missing' };
        expect(() => applyTreeTemplate(tree, broken)).toThrowError(/focusSlot/);
    });

    it('throws when a transition references an unknown toSlot', () => {
        const tree = createTree();
        const broken: TreeTemplateSpec = {
            ...makeSpec(),
            transitions: [
                { fromSlot: 'focus', fromChoiceId: 'comply', toSlot: 'ghost' },
            ],
        };
        expect(() => applyTreeTemplate(tree, broken)).toThrowError(/unknown slot/);
    });

    it('throws when a transition references an unknown fromSlot', () => {
        const tree = createTree();
        const broken: TreeTemplateSpec = {
            ...makeSpec(),
            transitions: [
                { fromSlot: 'ghost', fromChoiceId: 'comply', toSlot: END_NODE_ID },
            ],
        };
        expect(() => applyTreeTemplate(tree, broken)).toThrowError(/Unknown fromSlot/);
    });

    it('throws when a slot id mapping is empty (defensive guard)', () => {
        vi.spyOn(editorHelpers, 'newEditorNodeId').mockReturnValue('');
        expect(() => applyTreeTemplate(createTree(), makeSpec())).toThrow(/Missing slot mapping/);
        vi.restoreAllMocks();
    });

    it('supports a template with a single node and only END transitions', () => {
        const tree = createTree();
        const spec: TreeTemplateSpec = {
            focusSlot: 'only',
            nodes: {
                only: {
                    type: 'prompt',
                    prompt: 'Only',
                    choices: [
                        { id: 'a', label: 'A' },
                        { id: 'b', label: 'B' },
                    ],
                    offset: { x: 120, y: 0 },
                },
            },
            transitions: [
                { fromSlot: 'only', fromChoiceId: 'a', toSlot: END_NODE_ID, outcome: 'safe' },
                { fromSlot: 'only', fromChoiceId: 'b', toSlot: END_NODE_ID, outcome: 'at_risk' },
            ],
        };
        const { nextTree, focusNodeId } = applyTreeTemplate(tree, spec);
        expect(focusNodeId).toBeDefined();
        expect(Object.keys(nextTree.nodes)).toHaveLength(Object.keys(tree.nodes).length + 1);
        const edges = nextTree.transitions.filter((t) => t.fromNodeId === focusNodeId);
        expect(edges).toHaveLength(2);
        expect(edges.every((e) => e.toNodeId === END_NODE_ID)).toBe(true);
    });
});

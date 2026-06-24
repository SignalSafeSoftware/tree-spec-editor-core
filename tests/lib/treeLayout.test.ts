import { describe, expect, it } from 'vitest';
import { END_NODE_ID, readGraphEditorMeta, type EditorTree } from '@signalsafe/tree-spec';
import {
    autoLayoutTree,
    DEFAULT_NODE_LAYOUT_HEIGHT,
    getNextSpawnPosition,
    LAYOUT_SNAP_GRID,
    snapToGrid,
} from '../../src/lib/treeLayout';
import { DEFAULT_GRAPH_NODE_WIDTH } from '../../src/lib/nodeHints';

function createTree(): EditorTree {
    return {
        start_node: 'start',
        nodes: {
            start: {
                id: 'start',
                type: 'prompt',
                prompt: 'Start',
                choices: [{ id: 'go-left', label: 'Left' }, { id: 'go-right', label: 'Right' }],
                position: { x: 1, y: 1 },
            },
            beta: {
                id: 'beta',
                type: 'prompt',
                prompt: 'Beta',
                choices: [{ id: 'finish', label: 'Finish' }],
                position: { x: 2, y: 2 },
            },
            alpha: {
                id: 'alpha',
                type: 'prompt',
                prompt: 'Alpha',
                choices: [{ id: 'continue', label: 'Continue' }],
                position: { x: 3, y: 3 },
            },
            orphan: {
                id: 'orphan',
                type: 'info',
                prompt: 'Orphan',
                choices: [],
                position: { x: 4, y: 4 },
            },
        },
        transitions: [
            { id: 't1', fromNodeId: 'start', fromChoiceId: 'go-left', toNodeId: 'beta' },
            { id: 't2', fromNodeId: 'start', fromChoiceId: 'go-right', toNodeId: 'alpha' },
            { id: 't3', fromNodeId: 'alpha', fromChoiceId: 'continue', toNodeId: END_NODE_ID, outcome: 'safe' },
            { id: 't4', fromNodeId: 'beta', fromChoiceId: 'finish', toNodeId: '' },
        ],
    };
}

function expectSnapped(position: { x: number; y: number } | undefined): void {
    expect(position).toBeTruthy();
    expect(position!.x % LAYOUT_SNAP_GRID).toBe(0);
    expect(position!.y % LAYOUT_SNAP_GRID).toBe(0);
}

describe('treeLayout', () => {
    it('computes the next spawn position from the current node count', () => {
        expect(getNextSpawnPosition(createTree())).toEqual({ x: 80, y: 256 });
    });

    it('snaps values to the layout grid', () => {
        expect(snapToGrid(142)).toBe(140);
        expect(snapToGrid(151)).toBe(160);
    });

    it('lays out reachable nodes left-to-right with END as a virtual sink', () => {
        const laidOut = autoLayoutTree(createTree());
        const start = laidOut.nodes.start?.position;
        const alpha = laidOut.nodes.alpha?.position;
        const beta = laidOut.nodes.beta?.position;
        const orphan = laidOut.nodes.orphan?.position;

        expectSnapped(start);
        expectSnapped(alpha);
        expectSnapped(beta);
        expectSnapped(orphan);

        expect(start!.x).toBeLessThan(alpha!.x);
        expect(start!.x).toBeLessThan(beta!.x);
        expect(orphan!.x).toBeGreaterThan(alpha!.x);
        expect(readGraphEditorMeta(laidOut._meta).end_position?.x ?? 0).toBeGreaterThan(alpha!.x);
    });

    it('does not create additional levels for END transitions or blank targets', () => {
        const laidOut = autoLayoutTree(createTree());
        expect(laidOut.nodes.alpha?.position?.x).toBeGreaterThan(laidOut.nodes.start?.position?.x ?? 0);
        expect(laidOut.nodes.beta?.position?.x).toBeGreaterThan(laidOut.nodes.start?.position?.x ?? 0);
    });

    it('does not throw when start_node is missing from nodes (skips position for unknown ids)', () => {
        const tree: EditorTree = {
            start_node: 'missing',
            nodes: {},
            transitions: [],
        };

        expect(() => autoLayoutTree(tree)).not.toThrow();
        expect(autoLayoutTree(tree)).toEqual({
            ...tree,
            nodes: {},
        });
    });

    it('reuses an existing level when multiple paths reach the same node', () => {
        const tree = createTree();
        tree.transitions.push({
            id: 't5',
            fromNodeId: 'beta',
            fromChoiceId: 'finish',
            toNodeId: 'alpha',
        });

        const laidOut = autoLayoutTree(tree);
        expect(laidOut.nodes.alpha?.position?.x).toBeGreaterThan(laidOut.nodes.start?.position?.x ?? 0);
        expect(laidOut.nodes.beta?.position?.x).toBeGreaterThan(laidOut.nodes.start?.position?.x ?? 0);
    });

    it('nudges overlapping unlocked nodes apart during auto layout', () => {
        const overlapPosition = { x: 80, y: 80 };
        const tree: EditorTree = {
            start_node: 'start',
            nodes: {
                start: {
                    id: 'start',
                    type: 'prompt',
                    prompt: 'Start',
                    choices: [{ id: 'go', label: 'Go' }],
                    position: { x: 0, y: 0 },
                },
                blocker: {
                    id: 'blocker',
                    type: 'prompt',
                    prompt: 'Blocker',
                    choices: [],
                    position: overlapPosition,
                    render_hints: {
                        editor: {
                            locked: true,
                            graph_position: overlapPosition,
                        },
                    },
                },
                orphanA: {
                    id: 'orphanA',
                    type: 'prompt',
                    prompt: 'Orphan A',
                    choices: [],
                    position: overlapPosition,
                },
                orphanB: {
                    id: 'orphanB',
                    type: 'prompt',
                    prompt: 'Orphan B',
                    choices: [],
                    position: overlapPosition,
                },
            },
            transitions: [
                { id: 't1', fromNodeId: 'start', fromChoiceId: 'go', toNodeId: END_NODE_ID, outcome: 'safe' },
            ],
        };

        const laidOut = autoLayoutTree(tree);
        const positions = [
            laidOut.nodes.start?.position,
            laidOut.nodes.orphanA?.position,
            laidOut.nodes.orphanB?.position,
        ].filter((position): position is { x: number; y: number } => position != null);

        const gap = 20;
        for (let i = 0; i < positions.length; i += 1) {
            for (let j = i + 1; j < positions.length; j += 1) {
                const a = positions[i]!;
                const b = positions[j]!;
                const separated =
                    a.x + DEFAULT_GRAPH_NODE_WIDTH + gap <= b.x ||
                    b.x + DEFAULT_GRAPH_NODE_WIDTH + gap <= a.x ||
                    a.y + DEFAULT_NODE_LAYOUT_HEIGHT + gap <= b.y ||
                    b.y + DEFAULT_NODE_LAYOUT_HEIGHT + gap <= a.y;
                expect(separated).toBe(true);
            }
        }

        expect(laidOut.nodes.blocker?.position).toEqual(overlapPosition);
    });

    it('nudges unlocked node when locked node is first in collision pair', () => {
        const baseTree: EditorTree = {
            start_node: 'start',
            nodes: {
                start: {
                    id: 'start',
                    type: 'prompt',
                    prompt: 'Start',
                    choices: [{ id: 'go', label: 'Go' }],
                    position: { x: 0, y: 0 },
                },
                free: {
                    id: 'free',
                    type: 'prompt',
                    prompt: 'Free',
                    choices: [{ id: 'done', label: 'Done' }],
                    position: { x: 0, y: 0 },
                },
            },
            transitions: [
                { id: 't1', fromNodeId: 'start', fromChoiceId: 'go', toNodeId: 'free' },
                { id: 't2', fromNodeId: 'free', fromChoiceId: 'done', toNodeId: END_NODE_ID, outcome: 'safe' },
            ],
        };

        const baseline = autoLayoutTree(baseTree);
        const freePosition = baseline.nodes.free?.position;
        expect(freePosition).toBeTruthy();

        const treeWithBlocker: EditorTree = {
            ...baseTree,
            nodes: {
                blocker: {
                    id: 'blocker',
                    type: 'prompt',
                    prompt: 'Blocker',
                    choices: [],
                    position: freePosition!,
                    render_hints: {
                        editor: {
                            locked: true,
                            graph_position: freePosition!,
                        },
                    },
                },
                ...baseTree.nodes,
            },
        };

        const laidOut = autoLayoutTree(treeWithBlocker);
        expect(laidOut.nodes.blocker?.position).toEqual(freePosition);
        expect(laidOut.nodes.free?.position).not.toEqual(freePosition);
        expect(laidOut.nodes.free?.position?.y).toBeGreaterThan(freePosition!.y);
    });
});

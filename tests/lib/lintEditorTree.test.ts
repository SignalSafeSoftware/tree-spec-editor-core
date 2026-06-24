import { describe, expect, it } from 'vitest';
import { END_NODE_ID } from '../../src/model';
import { lintEditorTree } from '../../src/lib/editorHelpers';
import type { EditorTree } from '../../src/model';

describe('lintEditorTree', () => {
    it('flags END transition without outcome', () => {
        const tree: EditorTree = {
            start_node: 'a',
            nodes: {
                a: {
                    id: 'a',
                    type: 'prompt',
                    prompt: 'x',
                    choices: [{ id: 'c1', label: 'Go' }],
                    position: { x: 0, y: 0 },
                },
            },
            transitions: [{ id: 't1', fromNodeId: 'a', fromChoiceId: 'c1', toNodeId: END_NODE_ID }],
        };
        const issues = lintEditorTree(tree);
        expect(issues.some((i) => i.message.includes('outcome'))).toBe(true);
    });

    it('passes when END transition has outcome and all choices reach END', () => {
        const tree: EditorTree = {
            start_node: 'a',
            nodes: {
                a: {
                    id: 'a',
                    type: 'prompt',
                    prompt: 'x',
                    choices: [{ id: 'c1', label: 'Go' }],
                    position: { x: 0, y: 0 },
                },
            },
            transitions: [
                { id: 't1', fromNodeId: 'a', fromChoiceId: 'c1', toNodeId: END_NODE_ID, outcome: 'safe' },
            ],
        };
        expect(lintEditorTree(tree)).toHaveLength(0);
    });

    it('flags duplicate transitions, missing transitions, unreachable nodes, and dead-end paths', () => {
        const tree: EditorTree = {
            start_node: 'a',
            nodes: {
                a: {
                    id: 'a',
                    type: 'prompt',
                    prompt: 'x',
                    choices: [
                        { id: 'c1', label: 'Go' },
                        { id: 'c2', label: 'Loop' },
                    ],
                    position: { x: 0, y: 0 },
                },
                b: {
                    id: 'b',
                    type: 'prompt',
                    prompt: 'y',
                    choices: [{ id: 'c3', label: 'Back' }],
                    position: { x: 100, y: 0 },
                },
                orphan: {
                    id: 'orphan',
                    type: 'prompt',
                    prompt: 'z',
                    choices: [],
                    position: { x: 200, y: 0 },
                },
            },
            transitions: [
                { id: 't1', fromNodeId: 'a', fromChoiceId: 'c1', toNodeId: 'b' },
                { id: 't2', fromNodeId: 'a', fromChoiceId: 'c1', toNodeId: END_NODE_ID, outcome: 'safe' },
                { id: 't3', fromNodeId: 'b', fromChoiceId: 'c3', toNodeId: 'a' },
            ],
        };

        const issues = lintEditorTree(tree);
        expect(issues.some((i) => i.message.includes('Duplicate transition'))).toBe(true);
        expect(issues.some((i) => i.message.includes("Missing transition for choice 'c2'"))).toBe(true);
        expect(issues.some((i) => i.message.includes("Node 'orphan' is unreachable"))).toBe(true);
        expect(issues.some((i) => i.message.includes('do not reach END'))).toBe(true);
    });

    it('includes appearance warnings from lintEditorAppearance', () => {
        const tree: EditorTree = {
            start_node: 'a',
            nodes: {
                a: {
                    id: 'a',
                    type: 'prompt',
                    prompt: 'x',
                    choices: [{ id: 'c1', label: 'Go' }],
                    render_hints: { editor: { width: 0 } },
                },
            },
            transitions: [
                { id: 't1', fromNodeId: 'a', fromChoiceId: 'c1', toNodeId: END_NODE_ID, outcome: 'safe' },
            ],
        };

        const issues = lintEditorTree(tree);
        expect(issues.some((i) => i.severity === 'warning' && i.message.includes('width'))).toBe(true);
    });

    it('flags transition pointing to a missing target node', () => {
        const tree: EditorTree = {
            start_node: 'a',
            nodes: {
                a: {
                    id: 'a',
                    type: 'prompt',
                    prompt: 'x',
                    choices: [{ id: 'c1', label: 'Go' }],
                    position: { x: 0, y: 0 },
                },
            },
            transitions: [{ id: 't1', fromNodeId: 'a', fromChoiceId: 'c1', toNodeId: 'missing' }],
        };

        const issues = lintEditorTree(tree);
        expect(issues.some((i) => i.message.includes("points to missing node 'missing'"))).toBe(true);
    });

    it('flags leaf nodes with no choices that cannot reach END', () => {
        const tree: EditorTree = {
            start_node: 'a',
            nodes: {
                a: {
                    id: 'a',
                    type: 'prompt',
                    prompt: 'x',
                    choices: [{ id: 'c1', label: 'Go' }],
                    position: { x: 0, y: 0 },
                },
                dead: {
                    id: 'dead',
                    type: 'prompt',
                    prompt: 'dead end',
                    choices: [],
                    position: { x: 100, y: 0 },
                },
            },
            transitions: [{ id: 't1', fromNodeId: 'a', fromChoiceId: 'c1', toNodeId: 'dead' }],
        };

        const issues = lintEditorTree(tree);
        expect(issues.some((i) => i.message.includes("Node 'dead' has paths that do not reach END"))).toBe(true);
    });

    it('flags nodes with missing choice transitions as not reaching END', () => {
        const tree: EditorTree = {
            start_node: 'a',
            nodes: {
                a: {
                    id: 'a',
                    type: 'prompt',
                    prompt: 'x',
                    choices: [
                        { id: 'c1', label: 'End' },
                        { id: 'c2', label: 'Nowhere' },
                    ],
                    position: { x: 0, y: 0 },
                },
            },
            transitions: [
                { id: 't1', fromNodeId: 'a', fromChoiceId: 'c1', toNodeId: END_NODE_ID, outcome: 'safe' },
            ],
        };

        const issues = lintEditorTree(tree);
        expect(issues.some((i) => i.message.includes("Missing transition for choice 'c2'"))).toBe(true);
        expect(issues.some((i) => i.message.includes("Node 'a' has paths that do not reach END"))).toBe(true);
    });
});

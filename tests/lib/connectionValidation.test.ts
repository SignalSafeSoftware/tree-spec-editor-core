import { describe, expect, it } from 'vitest';

import {
    applyEditorConnect,
    applyEditorReconnect,
    choiceIdFromHandle,
    isValidEditorConnection,
} from '../../src/lib/connectionValidation';
import { END_NODE_ID } from '../../src/model';
import type { EditorTree } from '../../src/model';

function createTree(): EditorTree {
    return {
        start_node: 'start',
        nodes: {
            start: {
                id: 'start',
                type: 'prompt',
                prompt: 'Pick',
                choices: [
                    { id: 'c1', label: 'A' },
                    { id: 'c2', label: 'B' },
                ],
                position: { x: 0, y: 0 },
            },
            review: {
                id: 'review',
                type: 'prompt',
                prompt: 'Review',
                choices: [],
                position: { x: 200, y: 0 },
            },
        },
        transitions: [
            { id: 't1', fromNodeId: 'start', fromChoiceId: 'c1', toNodeId: 'review' },
        ],
    };
}

describe('choiceIdFromHandle', () => {
    it('parses choice handles and passthrough ids', () => {
        expect(choiceIdFromHandle('choice:verify')).toBe('verify');
        expect(choiceIdFromHandle('plain')).toBe('plain');
        expect(choiceIdFromHandle(null)).toBe('');
    });
});

describe('isValidEditorConnection', () => {
    it('accepts valid node and END targets from choice handles', () => {
        const tree = createTree();
        expect(
            isValidEditorConnection(tree, {
                source: 'start',
                target: 'review',
                sourceHandle: 'choice:c2',
                targetHandle: 'in',
            }),
        ).toBe(true);
        expect(
            isValidEditorConnection(tree, {
                source: 'start',
                target: END_NODE_ID,
                sourceHandle: 'choice:c2',
            }),
        ).toBe(true);
    });

    it('rejects missing endpoints, unknown nodes, self-loops, and non-choice handles', () => {
        const tree = createTree();
        expect(isValidEditorConnection(tree, { source: 'start', target: 'review' })).toBe(false);
        expect(
            isValidEditorConnection(tree, {
                source: 'start',
                target: 'missing',
                sourceHandle: 'choice:c2',
            }),
        ).toBe(false);
        expect(
            isValidEditorConnection(tree, {
                source: 'start',
                target: 'start',
                sourceHandle: 'choice:c2',
            }),
        ).toBe(false);
        expect(
            isValidEditorConnection(tree, {
                source: END_NODE_ID,
                target: 'review',
                sourceHandle: 'choice:c2',
            }),
        ).toBe(false);
    });
});

describe('applyEditorConnect', () => {
    it('upserts a transition and replaces an existing edge for the same choice', () => {
        const tree = createTree();
        const first = applyEditorConnect(tree, {
            source: 'start',
            target: END_NODE_ID,
            sourceHandle: 'choice:c2',
        });
        expect(first?.transitions).toHaveLength(2);
        expect(first?.transitions.find((t) => t.fromChoiceId === 'c2')?.toNodeId).toBe(END_NODE_ID);

        const second = applyEditorConnect(first!, {
            source: 'start',
            target: 'review',
            sourceHandle: 'choice:c2',
        });
        expect(second?.transitions.filter((t) => t.fromChoiceId === 'c2')).toHaveLength(1);
        expect(second?.transitions.find((t) => t.fromChoiceId === 'c2')?.toNodeId).toBe('review');
    });
});

describe('applyEditorReconnect', () => {
    it('updates only the target while preserving transition id and choice', () => {
        const tree = createTree();
        const reconnected = applyEditorReconnect(
            tree,
            { id: 't1', source: 'start', sourceHandle: 'choice:c1', target: 'review' },
            { source: 'start', target: END_NODE_ID, targetHandle: 'in' },
        );
        expect(reconnected?.transitions).toHaveLength(1);
        expect(reconnected?.transitions[0]).toMatchObject({
            id: 't1',
            fromNodeId: 'start',
            fromChoiceId: 'c1',
            toNodeId: END_NODE_ID,
            outcome: 'at_risk',
        });
    });

    it('preserves existing outcome when reconnecting to END', () => {
        const tree: EditorTree = {
            ...createTree(),
            transitions: [
                {
                    id: 't1',
                    fromNodeId: 'start',
                    fromChoiceId: 'c1',
                    toNodeId: END_NODE_ID,
                    outcome: 'safe',
                },
            ],
        };

        const reconnected = applyEditorReconnect(
            tree,
            { id: 't1', source: 'start', sourceHandle: 'choice:c1', target: END_NODE_ID },
            { source: 'start', target: END_NODE_ID, targetHandle: 'in' },
        );

        expect(reconnected?.transitions[0]?.outcome).toBe('safe');
    });

    it('clears outcome when reconnecting from END to a non-END node', () => {
        const tree: EditorTree = {
            ...createTree(),
            transitions: [
                {
                    id: 't1',
                    fromNodeId: 'start',
                    fromChoiceId: 'c1',
                    toNodeId: END_NODE_ID,
                    outcome: 'safe',
                },
            ],
        };

        const reconnected = applyEditorReconnect(
            tree,
            { id: 't1', source: 'start', sourceHandle: 'choice:c1', target: END_NODE_ID },
            { source: 'start', target: 'review', targetHandle: 'in' },
        );

        expect(reconnected?.transitions[0]?.outcome).toBeUndefined();
    });
});

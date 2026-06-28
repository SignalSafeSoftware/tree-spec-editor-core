import { describe, expect, it } from 'vitest';

import {
    deleteTransitionsForChoice,
    getTransition,
    upsertTransition,
} from '../../src/lib/transitionHelpers';
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
            },
        },
        transitions: [
            { id: 't1', fromNodeId: 'start', fromChoiceId: 'c1', toNodeId: 'next' },
        ],
    };
}

describe('transitionHelpers', () => {
    it('getTransition finds a transition by source node and choice', () => {
        const tree = createTree();
        expect(getTransition(tree, 'start', 'c1')?.id).toBe('t1');
        expect(getTransition(tree, 'start', 'c2')).toBeUndefined();
    });

    it('upsertTransition replaces an existing transition by id', () => {
        const tree = createTree();
        const next = upsertTransition(tree, {
            id: 't1',
            fromNodeId: 'start',
            fromChoiceId: 'c1',
            toNodeId: 'other',
        });
        expect(next.transitions).toHaveLength(1);
        expect(next.transitions[0]?.toNodeId).toBe('other');
    });

    it('upsertTransition appends when id is new', () => {
        const tree = createTree();
        const next = upsertTransition(tree, {
            id: 't2',
            fromNodeId: 'start',
            fromChoiceId: 'c2',
            toNodeId: 'next',
        });
        expect(next.transitions).toHaveLength(2);
        expect(getTransition(next, 'start', 'c2')?.id).toBe('t2');
    });

    it('deleteTransitionsForChoice removes matching edges only', () => {
        const tree = upsertTransition(createTree(), {
            id: 't2',
            fromNodeId: 'start',
            fromChoiceId: 'c2',
            toNodeId: 'next',
        });
        const next = deleteTransitionsForChoice(tree, 'start', 'c1');
        expect(next.transitions).toHaveLength(1);
        expect(next.transitions[0]?.fromChoiceId).toBe('c2');
    });
});

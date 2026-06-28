import { describe, expect, it } from 'vitest';

import { END_NODE_ID } from '../../src/model';
import type { EditorTree } from '../../src/model';
import {
    moveChoiceInTree,
    moveNodeChoice,
    renameNodeChoiceId,
} from '../../src/lib/choiceMoveHelpers';

function createTree(): EditorTree {
    return {
        start_node: 'start',
        nodes: {
            start: {
                id: 'start',
                type: 'prompt',
                prompt: 'Start',
                choices: [
                    { id: 'c1', label: 'First' },
                    { id: 'c2', label: 'Second' },
                ],
            },
            target: {
                id: 'target',
                type: 'prompt',
                prompt: 'Target',
                choices: [{ id: 't1', label: 'Only' }],
            },
        },
        transitions: [
            { id: 'edge-1', fromNodeId: 'start', fromChoiceId: 'c1', toNodeId: 'target' },
        ],
    };
}

describe('moveNodeChoice', () => {
    it('swaps adjacent choices within a node', () => {
        const tree = createTree();
        const reordered = moveNodeChoice(tree.nodes.start!.choices, 'c1', 'down');
        expect(reordered?.map((choice) => choice.id)).toEqual(['c2', 'c1']);
    });

    it('returns null when the move is out of range', () => {
        const tree = createTree();
        expect(moveNodeChoice(tree.nodes.start!.choices, 'c1', 'up')).toBeNull();
        expect(moveNodeChoice(tree.nodes.start!.choices, 'missing', 'down')).toBeNull();
    });
});

describe('moveChoiceInTree', () => {
    it('reorders a choice within the same node', () => {
        const next = moveChoiceInTree(createTree(), 'start', 'c2', 'start', 0);
        expect(next?.nodes.start?.choices.map((choice) => choice.id)).toEqual(['c2', 'c1']);
    });

    it('moves a choice to another node and rewrites its outgoing transition', () => {
        const next = moveChoiceInTree(createTree(), 'start', 'c1', 'target', 1);
        expect(next?.nodes.start?.choices.map((choice) => choice.id)).toEqual(['c2']);
        expect(next?.nodes.target?.choices.map((choice) => choice.id)).toEqual(['t1', 'c1']);
        expect(
            next?.transitions.find((transition) => transition.fromChoiceId === 'c1')?.fromNodeId,
        ).toBe('target');
    });

    it('rejects END as a move target', () => {
        expect(moveChoiceInTree(createTree(), 'start', 'c1', END_NODE_ID, 0)).toBeNull();
    });
});

describe('renameNodeChoiceId', () => {
    it('renames a choice id and updates transitions', () => {
        const next = renameNodeChoiceId(createTree(), 'start', 'c1', 'verify');
        expect(next?.nodes.start?.choices.some((choice) => choice.id === 'verify')).toBe(true);
        expect(
            next?.transitions.find((transition) => transition.fromChoiceId === 'verify')?.id,
        ).toBe('edge-1');
    });

    it('returns null when the new id collides or is blank', () => {
        expect(renameNodeChoiceId(createTree(), 'start', 'c1', 'c2')).toBeNull();
        expect(renameNodeChoiceId(createTree(), 'start', 'c1', '   ')).toBeNull();
    });
});

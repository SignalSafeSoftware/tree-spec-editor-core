import { afterEach, describe, expect, it, vi } from 'vitest';
import { END_NODE_ID, type EditorTree, type EditorTransition } from '../../src/model';
import {
    TREE_SPEC_NODE_TYPE_PRESETS,
    deleteTransitionsForChoice,
    getTransition,
    moveChoiceInTree,
    moveNodeChoice,
    renameNodeChoiceId,
    parsePydanticOutcomeErrors,
    safeUUID,
    shouldQueueInitialValidation,
    upsertTransition,
} from '../../src/lib/editorHelpers';

function createTree(overrides: Partial<EditorTree> = {}): EditorTree {
    return {
        start_node: 'start',
        nodes: {
            start: {
                id: 'start',
                type: 'prompt',
                prompt: 'Start here',
                choices: [
                    { id: 'c1', label: 'First' },
                    { id: 'c2', label: 'Second' },
                ],
                position: { x: 0, y: 0 },
            },
        },
        transitions: [],
        ...overrides,
    };
}

const originalCrypto = globalThis.crypto;

afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true,
        writable: true,
    });
});

describe('editorHelpers', () => {
    it('exposes stable node type presets', () => {
        expect(TREE_SPEC_NODE_TYPE_PRESETS).toEqual(['prompt', 'email', 'sms', 'call', 'web', 'attachment', 'outcome']);
    });

    it('uses crypto.randomUUID when available', () => {
        Object.defineProperty(globalThis, 'crypto', {
            value: { randomUUID: () => 'uuid-from-crypto' },
            configurable: true,
            writable: true,
        });

        expect(safeUUID()).toBe('uuid-from-crypto');
    });

    it('falls back to getRandomValues when crypto.randomUUID is unavailable', () => {
        const bytes = Uint8Array.from({ length: 16 }, (_, i) => i);
        Object.defineProperty(globalThis, 'crypto', {
            value: {
                getRandomValues(arr: Uint8Array) {
                    arr.set(bytes);
                    return arr;
                },
            },
            configurable: true,
            writable: true,
        });

        expect(safeUUID()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
    });

    it('finds and upserts transitions by id', () => {
        const existing: EditorTransition = {
            id: 't1',
            fromNodeId: 'start',
            fromChoiceId: 'c1',
            toNodeId: END_NODE_ID,
            outcome: 'safe',
        };
        const tree = createTree({ transitions: [existing] });

        expect(getTransition(tree, 'start', 'c1')).toEqual(existing);
        expect(getTransition(tree, 'start', 'missing')).toBeUndefined();

        const replaced = upsertTransition(tree, {
            ...existing,
            outcome: 'compromised',
        });
        expect(replaced.transitions).toEqual([
            {
                ...existing,
                outcome: 'compromised',
            },
        ]);

        const inserted = upsertTransition(tree, {
            id: 't2',
            fromNodeId: 'start',
            fromChoiceId: 'c2',
            toNodeId: 'followup',
        });
        expect(inserted.transitions).toEqual([
            existing,
            {
                id: 't2',
                fromNodeId: 'start',
                fromChoiceId: 'c2',
                toNodeId: 'followup',
            },
        ]);
    });

    it('deletes only transitions for the selected choice', () => {
        const tree = createTree({
            transitions: [
                { id: 't1', fromNodeId: 'start', fromChoiceId: 'c1', toNodeId: END_NODE_ID, outcome: 'safe' },
                { id: 't2', fromNodeId: 'start', fromChoiceId: 'c2', toNodeId: 'followup' },
                { id: 't3', fromNodeId: 'other', fromChoiceId: 'c1', toNodeId: END_NODE_ID, outcome: 'at_risk' },
            ],
        });

        expect(deleteTransitionsForChoice(tree, 'start', 'c1').transitions).toEqual([
            { id: 't2', fromNodeId: 'start', fromChoiceId: 'c2', toNodeId: 'followup' },
            { id: 't3', fromNodeId: 'other', fromChoiceId: 'c1', toNodeId: END_NODE_ID, outcome: 'at_risk' },
        ]);
    });

    it('parses END outcome validation errors into actionable issues', () => {
        const msg =
            "Transition to END must include outcome. input_value={'from': ['node-a', 'choice-1'], 'to': 'END'}";

        expect(parsePydanticOutcomeErrors(msg)).toEqual([
            {
                severity: 'error',
                message: 'Transition to END must include outcome (safe / at_risk / compromised).',
                node_id: 'node-a',
                choice_id: 'choice-1',
            },
        ]);
    });

    it('parses non-END outcome validation errors and generic fallback errors', () => {
        const nonEnd =
            "Non-END transition must not include outcome. input_value={'from': ['node-a', 'choice-1'], 'to': 'node-b'}";
        const generic =
            "Something else failed. input_value={'from': ['node-b', 'choice-2'], 'to': 'node-c'}";

        expect(parsePydanticOutcomeErrors(nonEnd)).toEqual([
            {
                severity: 'error',
                message: 'Non-END transition must not include outcome.',
                node_id: 'node-a',
                choice_id: 'choice-1',
            },
        ]);
        expect(parsePydanticOutcomeErrors(generic)).toEqual([
            {
                severity: 'error',
                message: 'Validation error',
                node_id: 'node-b',
                choice_id: 'choice-2',
            },
        ]);
    });

    it('returns null when a validation message has no transition payloads', () => {
        expect(parsePydanticOutcomeErrors('Plain error without input_value context')).toBeNull();
    });

    it('queues initial validation for anything that is not strictly published', () => {
        expect(shouldQueueInitialValidation(undefined)).toBe(true);
        expect(shouldQueueInitialValidation(null)).toBe(true);
        expect(shouldQueueInitialValidation(false)).toBe(true);
        expect(shouldQueueInitialValidation(true)).toBe(false);
    });

    it('moveNodeChoice swaps a choice up or down within the list', () => {
        const choices = createTree().nodes.start.choices ?? [];

        expect(moveNodeChoice(choices, 'c1', 'up')).toBeNull();
        expect(moveNodeChoice(choices, 'c2', 'down')).toBeNull();
        expect(moveNodeChoice(choices, 'missing', 'up')).toBeNull();

        const movedUp = moveNodeChoice(choices, 'c2', 'up');
        expect(movedUp?.map((choice) => choice.id)).toEqual(['c2', 'c1']);

        const movedDown = moveNodeChoice(movedUp!, 'c2', 'down');
        expect(movedDown?.map((choice) => choice.id)).toEqual(['c1', 'c2']);
    });

    it('renameNodeChoiceId updates choice ids and transitions', () => {
        const tree = createTree({
            transitions: [
                {
                    id: 't1',
                    fromNodeId: 'start',
                    fromChoiceId: 'c1',
                    toNodeId: 'n2',
                },
            ],
        });
        const next = renameNodeChoiceId(tree, 'start', 'c1', 'verify');
        expect(next?.nodes.start?.choices?.map((choice) => choice.id)).toEqual(['verify', 'c2']);
        expect(getTransition(next!, 'start', 'verify')?.toNodeId).toBe('n2');
        expect(renameNodeChoiceId(tree, 'start', 'c1', 'c2')).toBeNull();
    });

    it('moveChoiceInTree reorders within a node and moves transitions to another node', () => {
        const tree: EditorTree = {
            start_node: 'start',
            nodes: {
                start: {
                    id: 'start',
                    type: 'prompt',
                    prompt: 'A',
                    choices: [
                        { id: 'c1', label: 'One' },
                        { id: 'c2', label: 'Two' },
                    ],
                    position: { x: 0, y: 0 },
                },
                other: {
                    id: 'other',
                    type: 'prompt',
                    prompt: 'B',
                    choices: [{ id: 'c3', label: 'Three' }],
                    position: { x: 200, y: 0 },
                },
            },
            transitions: [
                {
                    id: 't1',
                    fromNodeId: 'start',
                    fromChoiceId: 'c2',
                    toNodeId: END_NODE_ID,
                    outcome: 'safe',
                },
            ],
        };

        const reordered = moveChoiceInTree(tree, 'start', 'c2', 'start', 0);
        expect(reordered?.nodes.start.choices?.map((choice) => choice.id)).toEqual(['c2', 'c1']);

        const transferred = moveChoiceInTree(tree, 'start', 'c2', 'other', 1);
        expect(transferred?.nodes.start.choices?.map((choice) => choice.id)).toEqual(['c1']);
        expect(transferred?.nodes.other.choices?.map((choice) => choice.id)).toEqual(['c3', 'c2']);
        expect(transferred?.transitions[0]?.fromNodeId).toBe('other');
        expect(transferred?.transitions[0]?.fromChoiceId).toBe('c2');
    });

    it('moveChoiceInTree and renameNodeChoiceId leave unrelated transitions unchanged', () => {
        const tree: EditorTree = {
            start_node: 'start',
            nodes: {
                start: {
                    id: 'start',
                    type: 'prompt',
                    prompt: 'A',
                    choices: [
                        { id: 'c1', label: 'One' },
                        { id: 'c2', label: 'Two' },
                    ],
                    position: { x: 0, y: 0 },
                },
                other: {
                    id: 'other',
                    type: 'prompt',
                    prompt: 'B',
                    choices: [{ id: 'c3', label: 'Three' }],
                    position: { x: 200, y: 0 },
                },
            },
            transitions: [
                { id: 't1', fromNodeId: 'start', fromChoiceId: 'c1', toNodeId: 'other' },
                { id: 't2', fromNodeId: 'start', fromChoiceId: 'c2', toNodeId: END_NODE_ID, outcome: 'safe' },
                { id: 't3', fromNodeId: 'other', fromChoiceId: 'c3', toNodeId: END_NODE_ID, outcome: 'at_risk' },
            ],
        };

        const moved = moveChoiceInTree(tree, 'start', 'c2', 'other', 0);
        expect(moved?.transitions.find((transition) => transition.id === 't1')).toEqual(tree.transitions[0]);
        expect(moved?.transitions.find((transition) => transition.id === 't3')).toEqual(tree.transitions[2]);

        const renamed = renameNodeChoiceId(tree, 'start', 'c1', 'verify');
        expect(renamed?.transitions.find((transition) => transition.id === 't2')).toEqual(tree.transitions[1]);
        expect(renamed?.transitions.find((transition) => transition.id === 't3')).toEqual(tree.transitions[2]);
    });
});

import { describe, expect, it } from 'vitest';

import { END_NODE_ID } from '../../src/model';
import type { EditorTree } from '../../src/model';
import type { AppendChoiceTemplateInput } from '../../src/lib/choiceTemplates';
import {
    appendChoiceTemplate,
    applyEditorConnectOnDrop,
} from '../../src/lib/choiceTemplates';

function createTree(): EditorTree {
    return {
        start_node: 'start',
        nodes: {
            start: {
                id: 'start',
                type: 'prompt',
                prompt: 'Pick',
                choices: [{ id: 'c1', label: 'A' }],
                position: { x: 0, y: 0 },
            },
        },
        transitions: [],
    };
}

describe('applyEditorConnectOnDrop', () => {
    it('spawns a node and connects the dragged choice', () => {
        const result = applyEditorConnectOnDrop(createTree(), 'start', 'choice:c1', { x: 300, y: 200 });
        expect(result).not.toBeNull();
        const { nextTree, nextNodeId } = result!;
        expect(nextTree.nodes[nextNodeId]).toMatchObject({ type: 'prompt', prompt: '' });
        expect(nextTree.transitions).toHaveLength(1);
        expect(nextTree.transitions[0]).toMatchObject({
            fromNodeId: 'start',
            fromChoiceId: 'c1',
            toNodeId: nextNodeId,
        });
    });

    it('rejects invalid sources', () => {
        expect(applyEditorConnectOnDrop(createTree(), END_NODE_ID, 'choice:c1', { x: 0, y: 0 })).toBeNull();
        expect(applyEditorConnectOnDrop(createTree(), 'start', 'in', { x: 0, y: 0 })).toBeNull();
    });
});

describe('appendChoiceTemplate', () => {
    const template: AppendChoiceTemplateInput = {
        choices: [{ label: 'Yes' }, { label: 'No' }],
    };

    it('appends template choices with fresh ids', () => {
        const next = appendChoiceTemplate(createTree(), 'start', template);
        expect(next?.nodes.start?.choices).toHaveLength(3);
        expect(next?.nodes.start?.choices?.slice(-2).map((choice) => choice.label)).toEqual(['Yes', 'No']);
    });

    it('preserves preset ids when provided on template choices', () => {
        const next = appendChoiceTemplate(createTree(), 'start', {
            choices: [
                { id: 'verify', label: 'Verify' },
                { id: 'bad', label: 'Bad' },
            ],
        });
        expect(next?.nodes.start?.choices?.slice(-2).map((choice) => choice.id)).toEqual(['verify', 'bad']);
    });

    it('returns null for END or missing nodes', () => {
        expect(appendChoiceTemplate(createTree(), END_NODE_ID, template)).toBeNull();
        expect(appendChoiceTemplate(createTree(), 'missing', template)).toBeNull();
    });
});

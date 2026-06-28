import { describe, expect, it } from 'vitest';
import {
    END_NODE_ID,
    autoLayoutTree,
    lintEditorTree,
    type EditorTree,
} from '../src/index';

describe('README quick start', () => {
    it('auto-layouts a minimal tree and passes lint', () => {
        const tree: EditorTree = autoLayoutTree({
            start_node: 'start',
            nodes: {
                start: {
                    id: 'start',
                    type: 'prompt',
                    prompt: 'Choose a response',
                    choices: [{ id: 'go', label: 'Continue' }],
                    position: { x: 0, y: 0 },
                },
            },
            transitions: [
                {
                    id: 't1',
                    fromNodeId: 'start',
                    fromChoiceId: 'go',
                    toNodeId: END_NODE_ID,
                    outcome: 'safe',
                },
            ],
        });

        expect(tree.nodes.start?.position).toBeDefined();
        expect(lintEditorTree(tree)).toEqual([]);
    });
});

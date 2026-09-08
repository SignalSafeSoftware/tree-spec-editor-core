import { describe, expect, it } from 'vitest';

import { END_NODE_ID } from '../src/model';
import { lintEditorTree } from '../src/lib/editorLint';
import type { EditorTree } from '../src/model';

function promptNode(id: string, choiceIds: string[]): EditorTree['nodes'][string] {
    return {
        id,
        type: 'prompt',
        prompt: id,
        choices: choiceIds.map((choiceId) => ({ id: choiceId, label: choiceId })),
    };
}

function transition(fromNodeId: string, fromChoiceId: string, toNodeId: string, id: string) {
    return { id, fromNodeId, fromChoiceId, toNodeId };
}

function convergingTree(layerCount: number): EditorTree {
    const nodes: EditorTree['nodes'] = {};
    const transitions: EditorTree['transitions'] = [];

    for (let layer = 0; layer < layerCount; layer += 1) {
        const nextLayer = layer + 1;
        const targets = nextLayer === layerCount
            ? [END_NODE_ID]
            : [`left-${nextLayer}`, `right-${nextLayer}`];

        for (const branch of ['left', 'right']) {
            const nodeId = `${branch}-${layer}`;
            nodes[nodeId] = promptNode(nodeId, ['left', 'right']);
            transitions.push(
                transition(nodeId, 'left', targets[0], `${nodeId}-left`),
                transition(nodeId, 'right', targets[1] ?? targets[0], `${nodeId}-right`),
            );
        }
    }

    nodes.start = promptNode('start', ['begin']);
    transitions.push(transition('start', 'begin', 'left-0', 'start-begin'));

    return { start_node: 'start', nodes, transitions };
}

describe('lintEditorTree path analysis', () => {
    it('handles heavily converging graphs without changing the all-paths result', () => {
        const issues = lintEditorTree(convergingTree(20));

        expect(issues.filter((issue) => issue.message.includes('paths that do not reach END'))).toEqual([]);
    });

    it('still reports cycles as paths that do not reach END', () => {
        const tree: EditorTree = {
            start_node: 'start',
            nodes: {
                start: promptNode('start', ['loop']),
                loop: promptNode('loop', ['back']),
            },
            transitions: [
                transition('start', 'loop', 'loop', 'start-loop'),
                transition('loop', 'back', 'start', 'loop-start'),
            ],
        };

        const issues = lintEditorTree(tree);

        expect(issues.filter((issue) => issue.message.includes('paths that do not reach END')).map((issue) => issue.node_id))
            .toEqual(expect.arrayContaining(['start', 'loop']));
    });
});

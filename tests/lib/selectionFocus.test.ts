import { describe, expect, it } from 'vitest';
import { END_NODE_ID, GRAPH_SELECTION_KIND, type EditorTree } from '../../src/model';
import { resolveGraphSelectionFocus } from '../../src/lib/selectionFocus';

function createTree(): EditorTree {
    return {
        start_node: 'start',
        nodes: {
            start: {
                id: 'start',
                type: 'prompt',
                prompt: 'Start',
                choices: [{ id: 'c1', label: 'Go' }],
                position: { x: 0, y: 0 },
            },
        },
        transitions: [
            {
                id: 'edge-1',
                fromNodeId: 'start',
                fromChoiceId: 'c1',
                toNodeId: END_NODE_ID,
                outcome: 'safe',
            },
        ],
    };
}

describe('resolveGraphSelectionFocus', () => {
    it('clears focus when selection is cleared', () => {
        expect(resolveGraphSelectionFocus({ kind: null, id: null })).toEqual({
            focusNodeId: null,
            focusChoiceId: null,
        });
    });

    it('focuses a real node and clears choice focus for node selection', () => {
        expect(
            resolveGraphSelectionFocus({
                kind: GRAPH_SELECTION_KIND.NODE,
                id: 'start',
            }),
        ).toEqual({
            focusNodeId: 'start',
            focusChoiceId: null,
        });
    });

    it('does not focus END as a node target', () => {
        expect(
            resolveGraphSelectionFocus({
                kind: GRAPH_SELECTION_KIND.NODE,
                id: END_NODE_ID,
            }),
        ).toEqual({
            focusNodeId: null,
            focusChoiceId: null,
        });
    });

    it('clears choice focus when node id is missing', () => {
        expect(
            resolveGraphSelectionFocus({
                kind: GRAPH_SELECTION_KIND.NODE,
                id: null,
            }),
        ).toEqual({
            focusNodeId: null,
            focusChoiceId: null,
        });
    });

    it('focuses source node and choice for edge selection', () => {
        const tree = createTree();
        expect(
            resolveGraphSelectionFocus(
                {
                    kind: GRAPH_SELECTION_KIND.EDGE,
                    id: 'edge-1',
                },
                tree,
            ),
        ).toEqual({
            focusNodeId: 'start',
            focusChoiceId: 'c1',
        });
    });

    it('returns null focus when edge selection lacks tree context', () => {
        expect(
            resolveGraphSelectionFocus({
                kind: GRAPH_SELECTION_KIND.EDGE,
                id: 'edge-1',
            }),
        ).toEqual({
            focusNodeId: null,
            focusChoiceId: null,
        });
    });

    it('returns null focus when edge id is unknown in the tree', () => {
        expect(
            resolveGraphSelectionFocus(
                {
                    kind: GRAPH_SELECTION_KIND.EDGE,
                    id: 'missing-edge',
                },
                createTree(),
            ),
        ).toEqual({
            focusNodeId: null,
            focusChoiceId: null,
        });
    });
});

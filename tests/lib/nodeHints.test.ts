import { describe, expect, it } from 'vitest';
import { type EditorNode, type EditorTree } from '../../src/model';
import {
    getEditorHints,
    getThemeHints,
    patchEditorHints,
    editorHintsToStyle,
    DEFAULT_GRAPH_NODE_WIDTH,
    resolveCanvasNodeWidth,
    DEFAULT_NODE_TEXT_WRAP,
    resolveNodeTextWrap,
    nodeTextWrapClassName,
} from '../../src/lib/nodeHints';

function sampleNode(overrides: Partial<EditorNode> = {}): EditorNode {
    return {
        id: 'n1',
        type: 'prompt',
        prompt: 'Hello',
        choices: [],
        render_hints: { layout: 'callout' },
        ...overrides,
    };
}

describe('nodeHints', () => {
    it('reads empty theme and editor hints by default', () => {
        expect(getThemeHints(sampleNode())).toEqual({});
        expect(getEditorHints(sampleNode())).toEqual({});
    });

    it('reads editor appearance hints from render_hints.editor', () => {
        const node = sampleNode({
            render_hints: {
                editor: {
                    backgroundColor: '#fff',
                    foregroundColor: '#111',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: 'Georgia',
                    textAlign: 'center',
                },
            },
        });

        expect(getEditorHints(node)).toMatchObject({
            backgroundColor: '#fff',
            foregroundColor: '#111',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'Georgia',
            textAlign: 'center',
        });
    });

    it('reads legacy theme appearance for canvas only via getEditorHints fallback', () => {
        const node = sampleNode({
            render_hints: {
                theme: { backgroundColor: '#legacy' },
            },
        });

        expect(getThemeHints(node)).toEqual({ backgroundColor: '#legacy' });
        expect(getEditorHints(node).backgroundColor).toBe('#legacy');
    });

    it('reads legacy theme foreground, fontSize, and fontWeight via getEditorHints fallback', () => {
        const node = sampleNode({
            render_hints: {
                theme: {
                    foregroundColor: '#eee',
                    fontSize: 14,
                    fontWeight: 700,
                },
            },
        });

        expect(getEditorHints(node)).toMatchObject({
            foregroundColor: '#eee',
            fontSize: 14,
            fontWeight: 700,
        });
    });

    it('prefers editor appearance over legacy theme on canvas read', () => {
        const node = sampleNode({
            render_hints: {
                theme: { backgroundColor: '#legacy' },
                editor: { backgroundColor: '#canvas' },
            },
        });

        expect(getEditorHints(node).backgroundColor).toBe('#canvas');
    });

    it('ignores invalid graph_position coordinates in render_hints.editor', () => {
        const node = sampleNode({
            render_hints: {
                editor: {
                    graph_position: { x: 'bad', y: 0 },
                },
            },
        });

        expect(getEditorHints(node)).not.toHaveProperty('graph_position');
    });

    it('reads editor hints including graph_position and locked', () => {
        const node = sampleNode({
            position: { x: 10, y: 20 },
            render_hints: {
                editor: {
                    locked: true,
                    width: 360,
                    height: 220,
                    graph_position: { x: 10, y: 20 },
                },
            },
        });

        expect(getEditorHints(node)).toEqual({
            locked: true,
            width: 360,
            height: 220,
            graph_position: { x: 10, y: 20 },
        });
    });

    it('patchEditorHints merges appearance without clobbering unrelated render_hints keys', () => {
        const node = sampleNode({ render_hints: { layout: 'callout', editor: { fontSize: 12 } } });
        const next = patchEditorHints(node, { backgroundColor: '#eee' });

        expect(next.render_hints).toEqual({
            layout: 'callout',
            editor: { fontSize: 12, backgroundColor: '#eee' },
        });
    });

    it('patchEditorHints updates position and graph_position together', () => {
        const node = sampleNode();
        const next = patchEditorHints(node, {
            locked: true,
            graph_position: { x: 40, y: 80 },
        });

        expect(next.position).toEqual({ x: 40, y: 80 });
        expect(next.render_hints?.editor).toMatchObject({
            locked: true,
            graph_position: { x: 40, y: 80 },
        });
    });

    it('patchEditorHints removes empty editor namespace when clearing values', () => {
        const node = sampleNode({ render_hints: { editor: { fontSize: 12 } } });
        const next = patchEditorHints(node, { fontSize: null as unknown as number });

        expect(next.render_hints?.editor).toBeUndefined();
    });

    it('editorHintsToStyle maps only defined keys', () => {
        expect(
            editorHintsToStyle({
                backgroundColor: '#abc',
                fontSize: 16,
            }),
        ).toEqual({
            backgroundColor: '#abc',
            fontSize: 16,
        });
    });

    it('patchEditorHints merges editor namespace without clobbering other render_hints keys', () => {
        const node = sampleNode({ render_hints: { layout: 'callout', editor: { fontSize: 12 } } });
        const next = patchEditorHints(node, { backgroundColor: '#eee' });

        expect(next.render_hints).toEqual({
            layout: 'callout',
            editor: { fontSize: 12, backgroundColor: '#eee' },
        });
    });

    it('resolveCanvasNodeWidth defaults to 280 and uses explicit width', () => {
        expect(resolveCanvasNodeWidth({})).toBe(DEFAULT_GRAPH_NODE_WIDTH);
        expect(resolveCanvasNodeWidth({ width: 360 })).toBe(360);
    });

    it('reads and resolves textWrap hint', () => {
        expect(getEditorHints(sampleNode({ render_hints: { editor: { textWrap: 'truncate' } } })).textWrap).toBe(
            'truncate',
        );
        expect(resolveNodeTextWrap({})).toBe(DEFAULT_NODE_TEXT_WRAP);
        expect(resolveNodeTextWrap({ textWrap: 'truncate' })).toBe('truncate');
        expect(nodeTextWrapClassName('wrap')).toContain('graph-editor-node-text-wrap');
        expect(nodeTextWrapClassName('truncate')).toContain('graph-editor-node-text-truncate');
        expect(nodeTextWrapClassName('truncate', 'flex')).toContain('graph-editor-node-flex-truncate');
    });
});

describe('needsInitialLayout and locked auto-layout', () => {
    it('needsInitialLayout is true when all nodes are at origin', async () => {
        const { needsInitialLayout } = await import('../../src/lib/treeLayout');
        const tree: EditorTree = {
            start_node: 'a',
            nodes: {
                a: { id: 'a', type: 'prompt', prompt: '', choices: [], position: { x: 0, y: 0 } },
                b: { id: 'b', type: 'prompt', prompt: '', choices: [] },
            },
            transitions: [],
        };
        expect(needsInitialLayout(tree)).toBe(true);
    });

    it('needsInitialLayout is false when any node has a non-origin position', async () => {
        const { needsInitialLayout } = await import('../../src/lib/treeLayout');
        const tree: EditorTree = {
            start_node: 'a',
            nodes: {
                a: { id: 'a', type: 'prompt', prompt: '', choices: [], position: { x: 10, y: 0 } },
                b: { id: 'b', type: 'prompt', prompt: '', choices: [], position: { x: 0, y: 0 } },
            },
            transitions: [],
        };
        expect(needsInitialLayout(tree)).toBe(false);
    });

    it('autoLayoutTree preserves locked node positions', async () => {
        const { autoLayoutTree } = await import('../../src/lib/treeLayout');
        const tree: EditorTree = {
            start_node: 'start',
            nodes: {
                start: {
                    id: 'start',
                    type: 'prompt',
                    prompt: '',
                    choices: [{ id: 'go', label: 'Go' }],
                    position: { x: 0, y: 0 },
                },
                next: {
                    id: 'next',
                    type: 'prompt',
                    prompt: '',
                    choices: [],
                    position: { x: 999, y: 888 },
                    render_hints: { editor: { locked: true, graph_position: { x: 999, y: 888 } } },
                },
            },
            transitions: [{ id: 't1', fromNodeId: 'start', fromChoiceId: 'go', toNodeId: 'next' }],
        };

        const laidOut = autoLayoutTree(tree);
        expect(laidOut.nodes.next?.position).toEqual({ x: 999, y: 888 });
        expect(laidOut.nodes.start?.position).not.toEqual({ x: 0, y: 0 });
    });
});

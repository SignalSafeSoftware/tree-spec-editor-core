import { describe, expect, it, vi } from 'vitest';
import * as choiceEdgeHints from '../../src/lib/choiceEdgeHints';
import { lintEditorAppearance } from '../../src/lib/lintEditorAppearance';
import type { EditorTree } from '../../src/model';

function sampleTree(overrides: Partial<EditorTree> = {}): EditorTree {
    return {
        start_node: 'start',
        nodes: {
            start: {
                id: 'start',
                type: 'prompt',
                prompt: 'Hello',
                choices: [],
                position: { x: 0, y: 0 },
            },
        },
        transitions: [],
        ...overrides,
    };
}

describe('lintEditorAppearance', () => {
    it('returns no issues for valid editor hints', () => {
        const tree = sampleTree({
            nodes: {
                start: {
                    id: 'start',
                    type: 'prompt',
                    prompt: 'Hello',
                    choices: [],
                    render_hints: {
                        editor: {
                            width: 320,
                            height: 180,
                            backgroundColor: '#ffffff',
                            foregroundColor: '#212529',
                            textWrap: 'truncate',
                            textAlign: 'left',
                            graph_position: { x: 10, y: 20 },
                        },
                    },
                },
            },
            _meta: {
                graph_editor: {
                    end_position: { x: 900, y: 100 },
                    viewport: { x: 0, y: 0, zoom: 1 },
                },
            },
        });

        expect(lintEditorAppearance(tree)).toEqual([]);
    });

    it('warns on invalid width, colors, and text wrap', () => {
        const tree = sampleTree({
            nodes: {
                start: {
                    id: 'start',
                    type: 'prompt',
                    prompt: 'Hello',
                    choices: [],
                    render_hints: {
                        editor: {
                            width: -1,
                            backgroundColor: 'red',
                            textWrap: 'ellipsis',
                        },
                    },
                },
            },
        });

        const messages = lintEditorAppearance(tree).map((issue) => issue.message);
        expect(messages.some((m) => m.includes('width'))).toBe(true);
        expect(messages.some((m) => m.includes('background color'))).toBe(true);
        expect(messages.some((m) => m.includes('text wrap'))).toBe(true);
    });

    it('warns on invalid graph editor meta', () => {
        const tree = sampleTree({
            _meta: {
                graph_editor: {
                    end_position: { x: 'bad', y: 0 },
                    viewport: { x: 0, y: 0, zoom: 0 },
                },
            },
        });

        const messages = lintEditorAppearance(tree).map((issue) => issue.message);
        expect(messages.some((m) => m.includes('END position'))).toBe(true);
        expect(messages.some((m) => m.includes('viewport'))).toBe(true);
    });

    it('warns on invalid height, fontSize, foregroundColor, textAlign, and graph_position coordinates', () => {
        const tree = sampleTree({
            nodes: {
                start: {
                    id: 'start',
                    type: 'prompt',
                    prompt: 'Hello',
                    choices: [],
                    render_hints: {
                        editor: {
                            height: 0,
                            fontSize: -12,
                            foregroundColor: 'not-a-color',
                            textAlign: 'justify',
                            graph_position: { x: Number.NaN, y: 10 },
                        },
                    },
                },
            },
        });

        const messages = lintEditorAppearance(tree).map((issue) => issue.message);
        expect(messages.some((m) => m.includes('height'))).toBe(true);
        expect(messages.some((m) => m.includes('font size'))).toBe(true);
        expect(messages.some((m) => m.includes('text color'))).toBe(true);
        expect(messages.some((m) => m.includes('text align'))).toBe(true);
        expect(messages.some((m) => m.includes('finite numeric x and y'))).toBe(true);
    });

    it('warns when graph_position is not an object', () => {
        const tree = sampleTree({
            nodes: {
                start: {
                    id: 'start',
                    type: 'prompt',
                    prompt: 'Hello',
                    choices: [],
                    render_hints: {
                        editor: {
                            graph_position: 'bad',
                        },
                    },
                },
            },
        });

        const messages = lintEditorAppearance(tree).map((issue) => issue.message);
        expect(messages.some((m) => m.includes('graph position must be an object'))).toBe(true);
    });

    it('warns on invalid choice strokeColor and edgeType', () => {
        const tree = sampleTree({
            nodes: {
                start: {
                    id: 'start',
                    type: 'prompt',
                    prompt: 'Hello',
                    render_hints: {},
                    choices: [
                        {
                            id: 'c1',
                            label: 'Go',
                            render_hints: {
                                editor: {
                                    strokeColor: 'red',
                                    edgeType: 'bezier',
                                },
                            },
                        },
                    ],
                },
            },
        });

        const issues = lintEditorAppearance(tree);
        expect(issues.some((issue) => issue.choice_id === 'c1' && issue.message.includes('strokeColor'))).toBe(
            true,
        );
    });

    it('warns on invalid choice edgeType', () => {
        vi.spyOn(choiceEdgeHints, 'getChoiceEdgeHints').mockReturnValue({
            edgeType: 'bezier' as never,
        });

        const tree = sampleTree({
            nodes: {
                start: {
                    id: 'start',
                    type: 'prompt',
                    prompt: 'Hello',
                    render_hints: {},
                    choices: [{ id: 'c1', label: 'Go' }],
                },
            },
        });

        const issues = lintEditorAppearance(tree);
        expect(issues.some((issue) => issue.choice_id === 'c1' && issue.message.includes('edge type'))).toBe(true);
        vi.restoreAllMocks();
    });

    it('warns on invalid default_edge_type in graph editor meta', () => {
        const tree = sampleTree({
            _meta: {
                graph_editor: {
                    default_edge_type: 'bezier',
                },
            },
        });

        const messages = lintEditorAppearance(tree).map((issue) => issue.message);
        expect(messages.some((m) => m.includes('default edge type'))).toBe(true);
    });
});

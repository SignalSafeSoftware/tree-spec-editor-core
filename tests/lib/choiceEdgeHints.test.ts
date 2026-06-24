import { describe, expect, it } from 'vitest';

import {
    DEFAULT_CANVAS_EDGE_STROKE,
    DEFAULT_EDGE_TYPE,
    getChoiceEdgeHints,
    patchChoiceEdgeHints,
    resolveDefaultEdgeType,
    resolveEffectiveEdgeType,
    resolveEdgeStrokeColorForDisplay,
    shouldShowEdgeLabel,
} from '../../src/lib/choiceEdgeHints';
import type { EditorChoice } from '../../src/model';

function sampleChoice(overrides: Partial<EditorChoice> = {}): EditorChoice {
    return {
        id: 'verify',
        label: 'Verify',
        ...overrides,
    };
}

describe('choiceEdgeHints', () => {
    it('reads and patches choice edge hints under render_hints.editor', () => {
        const choice = sampleChoice({
            render_hints: {
                editor: {
                    showLabel: false,
                    strokeColor: '#ff0000',
                    edgeType: 'step',
                },
            },
        });

        expect(getChoiceEdgeHints(choice)).toEqual({
            showLabel: false,
            strokeColor: '#ff0000',
            edgeType: 'step',
        });

        const patched = patchChoiceEdgeHints(choice, { strokeColor: '#00ff00', edgeType: 'default' });
        expect(getChoiceEdgeHints(patched)).toEqual({
            showLabel: false,
            strokeColor: '#00ff00',
            edgeType: 'default',
        });
    });

    it('resolves effective edge type from choice override or scenario default', () => {
        const choice = patchChoiceEdgeHints(sampleChoice(), { edgeType: 'straight' });
        expect(resolveEffectiveEdgeType(choice, undefined)).toBe('straight');
        expect(
            resolveEffectiveEdgeType(sampleChoice(), {
                graph_editor: { default_edge_type: 'step' },
            }),
        ).toBe('step');
        expect(resolveDefaultEdgeType(undefined)).toBe(DEFAULT_EDGE_TYPE);
    });

    it('shows labels by default and allows hiding them', () => {
        expect(shouldShowEdgeLabel(sampleChoice())).toBe(true);
        expect(shouldShowEdgeLabel(patchChoiceEdgeHints(sampleChoice(), { showLabel: false }))).toBe(false);
    });

    it('resolves display stroke color from author override or canvas default', () => {
        expect(resolveEdgeStrokeColorForDisplay(sampleChoice())).toBe(DEFAULT_CANVAS_EDGE_STROKE);
        expect(
            resolveEdgeStrokeColorForDisplay(
                patchChoiceEdgeHints(sampleChoice(), { strokeColor: '#ff0000' }),
            ),
        ).toBe('#ff0000');
    });

    it('patchChoiceEdgeHints clears nullish keys and removes empty editor bucket but keeps other render_hints keys', () => {
        const choice = sampleChoice({
            render_hints: {
                layout: 'callout',
                editor: { showLabel: true, strokeColor: '#ff0000' },
            },
        });

        const patched = patchChoiceEdgeHints(choice, {
            showLabel: null as unknown as boolean,
            strokeColor: undefined,
        });

        expect(patched.render_hints).toEqual({ layout: 'callout' });
        expect(patched.render_hints?.editor).toBeUndefined();
    });

    it('patchChoiceEdgeHints drops render_hints entirely when editor was the only key', () => {
        const choice = sampleChoice({
            render_hints: {
                editor: { strokeColor: '#ff0000' },
            },
        });

        const patched = patchChoiceEdgeHints(choice, { strokeColor: null as unknown as string });

        expect('render_hints' in patched).toBe(false);
    });

    it('getChoiceEdgeHints ignores invalid edgeType like bezier', () => {
        const choice = sampleChoice({
            render_hints: {
                editor: { edgeType: 'bezier', strokeColor: '#112233' },
            },
        });

        expect(getChoiceEdgeHints(choice)).toEqual({ strokeColor: '#112233' });
    });
});

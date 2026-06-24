import { describe, expect, it } from 'vitest';
import type { EditorTree } from '../../src/model';
import {
    computeDefaultEndPosition,
    patchGraphEditorMeta,
    resolveEndNodePosition,
    resolveGraphViewport,
} from '../../src/lib/graphEditorLayout';

function sampleTree(overrides: Partial<EditorTree> = {}): EditorTree {
    return {
        start_node: 'start',
        nodes: {
            start: {
                id: 'start',
                type: 'prompt',
                prompt: 'Hello',
                choices: [],
                position: { x: 100, y: 200 },
            },
            review: {
                id: 'review',
                type: 'prompt',
                prompt: 'Review',
                choices: [],
                position: { x: 520, y: 260 },
            },
        },
        transitions: [],
        ...overrides,
    };
}

describe('graphEditorLayout', () => {
    it('computeDefaultEndPosition places END to the right of the rightmost node', () => {
        expect(computeDefaultEndPosition(sampleTree())).toEqual({ x: 940, y: 230 });
    });

    it('resolveEndNodePosition prefers saved _meta end_position', () => {
        const tree = patchGraphEditorMeta(sampleTree(), {
            end_position: { x: 1200, y: 50 },
        });
        expect(resolveEndNodePosition(tree)).toEqual({ x: 1200, y: 50 });
    });

    it('resolveGraphViewport reads saved viewport', () => {
        const tree = patchGraphEditorMeta(sampleTree(), {
            viewport: { x: -100, y: 40, zoom: 1.25 },
        });
        expect(resolveGraphViewport(tree)).toEqual({ x: -100, y: 40, zoom: 1.25 });
    });
});

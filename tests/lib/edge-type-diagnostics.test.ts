import { describe, expect, it } from 'vitest';
import type { EditorTree } from '../../src/model';
import { lintEditorAppearance } from '../../src/lib/lintEditorAppearance';

function edgeWarnings(edgeType: unknown): string[] {
    const tree: EditorTree = {
        start_node: 'start',
        nodes: {
            start: {
                id: 'start',
                type: 'prompt',
                prompt: 'Start',
                choices: [
                    {
                        id: 'choice',
                        label: 'Continue',
                        render_hints: { editor: { edgeType } },
                    },
                ],
            },
        },
        transitions: [],
    };
    return lintEditorAppearance(tree)
        .filter((issue) => issue.choice_id === 'choice')
        .map((issue) => issue.message);
}

function warning(value: string): string {
    return `Choice edge type must be default, straight, smoothstep, or step (got ${value}).`;
}

describe('authored choice edge type diagnostics', () => {
    it.each([undefined, 'default', 'straight', 'smoothstep', 'step'])(
        'accepts the supported edge type %s',
        (value) => expect(edgeWarnings(value)).toEqual([]),
    );

    it.each(['bezier', '', 0, false, 2n, null, Symbol('edge')])(
        'preserves primitive diagnostic coercion for %s',
        (value) => expect(edgeWarnings(value)).toEqual([warning(String(value))]),
    );

    it('preserves a function diagnostic without invoking the function', () => {
        function malformedType(): never {
            throw new Error('An authored value is never called');
        }
        expect(edgeWarnings(malformedType)).toEqual([warning(String(malformedType))]);
    });

    it('shows structured malformed object and array values', () => {
        expect(edgeWarnings({ route: 'curve' })).toEqual([warning('{"route":"curve"}')]);
        expect(edgeWarnings(['straight', 'step'])).toEqual([warning('["straight","step"]')]);
    });

    it('reports circular authored values safely', () => {
        const circular: Record<string, unknown> = {};
        circular.self = circular;
        expect(edgeWarnings(circular)).toEqual([warning('[unserializable]')]);
    });
});

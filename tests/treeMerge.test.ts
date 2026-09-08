import { describe, expect, it } from 'vitest';

import { END_NODE_ID, type EditorTree } from '../src/model';
import { mergeEditorTrees } from '../src/lib/treeMerge';

function baseTree(): EditorTree {
    return {
        start_node: 'start',
        nodes: {
            start: {
                id: 'start',
                type: 'prompt',
                prompt: 'Choose',
                choices: [{ id: 'finish', label: 'Finish' }],
            },
        },
        transitions: [{
            id: 'finish-transition',
            fromNodeId: 'start',
            fromChoiceId: 'finish',
            toNodeId: END_NODE_ID,
            outcome: 'safe',
        }],
    };
}

describe('mergeEditorTrees', () => {
    it('merges independent node and transition edits', () => {
        const baseline = baseTree();
        const local = structuredClone(baseline);
        const remote = structuredClone(baseline);
        local.nodes.start!.prompt = 'Inspect first';
        remote.transitions[0]!.outcome = 'at_risk';

        const result = mergeEditorTrees(baseline, local, remote);

        expect(result.kind).toBe('merged');
        if (result.kind !== 'merged') return;
        expect(result.value.nodes.start?.prompt).toBe('Inspect first');
        expect(result.value.transitions[0]?.outcome).toBe('at_risk');
    });

    it('reports overlapping edits with an explicit path', () => {
        const baseline = baseTree();
        const local = structuredClone(baseline);
        const remote = structuredClone(baseline);
        local.nodes.start!.prompt = 'Local';
        remote.nodes.start!.prompt = 'Remote';

        const result = mergeEditorTrees(baseline, local, remote);

        expect(result.kind).toBe('conflict');
        if (result.kind !== 'conflict') return;
        expect(result.conflicts[0]?.path).toEqual(['nodes', 'start', 'prompt']);
    });

    it('preserves null values and treats a deletion against a remote edit as a conflict', () => {
        const baseline = baseTree();
        baseline.nodes.start!.render_hints = { theme: null };
        const local = structuredClone(baseline);
        const remote = structuredClone(baseline);
        local.nodes.start!.render_hints = {};
        remote.nodes.start!.render_hints = { theme: { color: 'blue' } };

        const result = mergeEditorTrees(baseline, local, remote);

        expect(result.kind).toBe('conflict');
        if (result.kind !== 'conflict') return;
        expect(result.conflicts[0]?.path).toEqual(['nodes', 'start', 'render_hints', 'theme']);
        expect(result.conflicts[0]?.baseline).toBeNull();
    });

    it('merges independent choice additions in deterministic order', () => {
        const baseline = baseTree();
        const local = structuredClone(baseline);
        const remote = structuredClone(baseline);
        local.nodes.start!.choices.push({ id: 'local', label: 'Local' });
        remote.nodes.start!.choices.push({ id: 'remote', label: 'Remote' });

        const result = mergeEditorTrees(baseline, local, remote);

        expect(result.kind).toBe('merged');
        if (result.kind !== 'merged') return;
        expect(result.value.nodes.start?.choices.map((choice) => choice.id)).toEqual(['finish', 'local', 'remote']);
    });
});

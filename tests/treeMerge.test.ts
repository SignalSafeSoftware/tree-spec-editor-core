import { describe, expect, it } from 'vitest';

import { END_NODE_ID, type EditorNode, type EditorTree } from '../src/model';
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

function startNode(tree: EditorTree): EditorNode {
    const node = tree.nodes.start;
    if (node === undefined) throw new Error('Missing test start node');
    return node;
}

describe('mergeEditorTrees', () => {
    it('merges a local choice reorder with independent remote edits without mutating inputs', () => {
        const baseline = baseTree();
        startNode(baseline).choices.push({ id: 'second', label: 'Second' }, { id: 'third', label: 'Third' });
        const local = structuredClone(baseline);
        const remote = structuredClone(baseline);
        startNode(local).choices.reverse();
        const second = startNode(remote).choices.find((choice) => choice.id === 'second');
        if (second === undefined) throw new Error('Missing second test choice');
        second.label = 'Updated second';
        const snapshots = structuredClone({ baseline, local, remote });

        const result = mergeEditorTrees(baseline, local, remote);

        expect(result.kind).toBe('merged');
        if (result.kind !== 'merged') return;
        expect(result.value.nodes.start?.choices.map((choice) => choice.id)).toEqual(['third', 'second', 'finish']);
        expect(result.value.nodes.start?.choices[1]?.label).toBe('Updated second');
        expect({ baseline, local, remote }).toEqual(snapshots);
    });

    it('rejects incompatible concurrent choice reorders at the array path', () => {
        const baseline = baseTree();
        startNode(baseline).choices.push({ id: 'second', label: 'Second' }, { id: 'third', label: 'Third' });
        const local = structuredClone(baseline);
        const remote = structuredClone(baseline);
        startNode(local).choices.reverse();
        const first = startNode(remote).choices.shift();
        if (first === undefined) throw new Error('Missing first test choice');
        startNode(remote).choices.push(first);

        const result = mergeEditorTrees(baseline, local, remote);

        expect(result.kind).toBe('conflict');
        if (result.kind !== 'conflict') return;
        expect(result.conflicts[0]?.path).toEqual(['nodes', 'start', 'choices']);
    });

    it('preserves a remote reorder while appending an independent local addition', () => {
        const baseline = baseTree();
        startNode(baseline).choices.push({ id: 'second', label: 'Second' });
        const local = structuredClone(baseline);
        const remote = structuredClone(baseline);
        startNode(local).choices.push({ id: 'new', label: 'New' });
        startNode(remote).choices.reverse();

        const result = mergeEditorTrees(baseline, local, remote);

        expect(result.kind).toBe('merged');
        if (result.kind !== 'merged') return;
        expect(result.value.nodes.start?.choices.map((choice) => choice.id)).toEqual(['second', 'finish', 'new']);
    });

    it('rejects duplicate choice identities when both sides change the collection', () => {
        const baseline = baseTree();
        const local = structuredClone(baseline);
        const remote = structuredClone(baseline);
        startNode(local).choices.push({ id: 'finish', label: 'Duplicate' });
        startNode(remote).choices.push({ id: 'new', label: 'New' });

        const result = mergeEditorTrees(baseline, local, remote);

        expect(result.kind).toBe('conflict');
        if (result.kind !== 'conflict') return;
        expect(result.conflicts[0]?.path).toEqual(['nodes', 'start', 'choices']);
    });

    it('retains missing versus null conflict values for own properties named like prototype members', () => {
        const baseline = baseTree();
        startNode(baseline).render_hints = { toString: null };
        const local = structuredClone(baseline);
        const remote = structuredClone(baseline);
        startNode(local).render_hints = {};
        startNode(remote).render_hints = { toString: 'changed' };

        const result = mergeEditorTrees(baseline, local, remote);

        expect(result.kind).toBe('conflict');
        if (result.kind !== 'conflict') return;
        expect(result.conflicts[0]?.path).toEqual(['nodes', 'start', 'render_hints', 'toString']);
        expect(result.conflicts[0]?.baseline).toBeNull();
        expect(result.conflicts[0]?.local).toBeUndefined();
        expect(result.conflicts[0]?.remote).toBe('changed');
    });

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

import { describe, expect, it } from 'vitest';
import { END_NODE_ID, type EditorNode, type EditorTree } from '../../src/model';
import { moveChoiceInTree, moveNodeChoice, renameNodeChoiceId } from '../../src/lib/choiceMoveHelpers';
import { appendChoiceTemplate, applyEditorConnectOnDrop } from '../../src/lib/choiceTemplates';
import { applyEditorConnect, applyEditorReconnect, isValidEditorConnection } from '../../src/lib/connectionValidation';
import { getChoiceEdgeHints, patchChoiceEdgeHints } from '../../src/lib/choiceEdgeHints';
import { computeDefaultEndPosition, resolveEndNodePosition } from '../../src/lib/graphEditorLayout';
import { getKeyboardShortcutAction } from '../../src/lib/keyboardShortcuts';
import { editorHintsToStyle, getEditorHints, patchEditorHints, type NodeEditorHints } from '../../src/lib/nodeHints';
import { lintEditorAppearance } from '../../src/lib/lintEditorAppearance';
import { lintEditorTree } from '../../src/lib/editorLint';
import { autoLayoutTree, needsInitialLayout } from '../../src/lib/treeLayout';
import { mergeEditorTrees } from '../../src/lib/treeMerge';
import { computeTreeDiffSummary, duplicateNode } from '../../src/lib/treeOperations';

function node(id = 'start'): EditorNode {
    return { id, type: 'prompt', prompt: id, choices: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }] };
}
function tree(): EditorTree {
    return {
        start_node: 'start', nodes: { start: node(), other: node('other') },
        transitions: [
            { id: 'a', fromNodeId: 'start', fromChoiceId: 'a', toNodeId: 'other' },
            { id: 'b', fromNodeId: 'start', fromChoiceId: 'b', toNodeId: END_NODE_ID, outcome: 'safe' },
            { id: 'z', fromNodeId: 'other', fromChoiceId: 'a', toNodeId: END_NODE_ID, outcome: 'at_risk' },
        ],
    };
}
function withoutChoices(value: EditorNode): EditorNode {
    const result = structuredClone(value);
    Reflect.deleteProperty(result, 'choices');
    return result;
}

describe('choice editing boundaries and draft compatibility', () => {
    it('rejects invalid move and rename requests without modifying the input', () => {
        const value = tree();
        const original = structuredClone(value);
        expect(moveChoiceInTree(value, END_NODE_ID, 'a', 'other', 0)).toBeNull();
        expect(moveChoiceInTree(value, 'absent', 'a', 'other', 0)).toBeNull();
        expect(moveChoiceInTree(value, 'start', 'a', 'absent', 0)).toBeNull();
        expect(moveChoiceInTree(value, 'start', 'absent', 'other', 0)).toBeNull();
        expect(moveChoiceInTree(value, 'start', 'a', 'start', -9)).toBeNull();
        expect(renameNodeChoiceId(value, 'start', 'a', 'a')).toBeNull();
        expect(renameNodeChoiceId(value, END_NODE_ID, 'a', 'new')).toBeNull();
        expect(renameNodeChoiceId(value, 'absent', 'a', 'new')).toBeNull();
        expect(renameNodeChoiceId(value, 'start', 'absent', 'new')).toBeNull();
        expect(value).toEqual(original);
    });
    it('moves down within a node and preserves unrelated outgoing transitions', () => {
        const value = tree();
        expect(moveChoiceInTree(value, 'start', 'a', 'start', 2)?.nodes.start?.choices.map(c => c.id)).toEqual(['b', 'a', 'c']);
        const moved = moveChoiceInTree(value, 'start', 'a', 'other', -4);
        expect(moved?.nodes.other?.choices[0]?.id).toBe('a');
        expect(moved?.transitions[1]).toBe(value.transitions[1]);
        expect(moved?.transitions[2]).toBe(value.transitions[2]);
        const renamed = renameNodeChoiceId(value, 'start', 'a', ' renamed ');
        expect(renamed?.nodes.start?.choices.map(c => c.id)).toEqual(['renamed', 'b', 'c']);
        expect(renamed?.transitions[1]).toBe(value.transitions[1]);
        expect(renamed?.transitions[2]).toBe(value.transitions[2]);
    });
    it('handles missing draft choices and sparse adjacent slots', () => {
        const value = tree();
        value.nodes.other = withoutChoices(node('other'));
        expect(moveChoiceInTree(value, 'other', 'a', 'start', 0)).toBeNull();
        expect(renameNodeChoiceId(value, 'other', 'a', 'new')).toBeNull();
        expect(moveChoiceInTree(value, 'start', 'a', 'other', 99)?.nodes.other?.choices.map(c => c.id)).toEqual(['a']);
        const choices = [{ id: 'a', label: 'A' }];
        choices.length = 2;
        expect(moveNodeChoice(choices, 'a', 'down')).toBeNull();
    });
    it('requires a real source choice when dropping a new connected node', () => {
        const value = tree();
        expect(applyEditorConnectOnDrop(value, END_NODE_ID, 'a', { x: 0, y: 0 })).toBeNull();
        expect(applyEditorConnectOnDrop(value, 'start', null, { x: 0, y: 0 })).toBeNull();
        expect(applyEditorConnectOnDrop(value, 'missing', 'a', { x: 0, y: 0 })).toBeNull();
        expect(applyEditorConnectOnDrop(value, 'start', 'absent', { x: 0, y: 0 })).toBeNull();
        value.nodes.start = withoutChoices(node());
        expect(applyEditorConnectOnDrop(value, 'start', 'a', { x: 0, y: 0 })).toBeNull();
    });
    it('applies authored node dimensions/type/prompt and preserves an existing transition identity', () => {
        const result = applyEditorConnectOnDrop(tree(), 'start', 'a', { x: 100, y: 120 }, { nodeWidth: 200, nodeHeight: 80, nodeType: 'info', prompt: 'New' });
        expect(result?.nextTree.nodes[result.nextNodeId]).toMatchObject({ type: 'info', prompt: 'New', position: { x: 0, y: 80 } });
        expect(result?.nextTree.transitions.find(t => t.id === 'a')?.toNodeId).toBe(result?.nextNodeId);
    });
    it('appends authored/blank template choice IDs to a legacy draft', () => {
        const value = tree(); value.nodes.start = withoutChoices(node());
        expect(appendChoiceTemplate(value, 'start', { choices: [] })).toBeNull();
        expect(appendChoiceTemplate(value, 'missing', { choices: [{ label: 'New' }] })).toBeNull();
        const result = appendChoiceTemplate(value, 'start', { choices: [{ id: ' authored ', label: 'A' }, { id: '  ', label: 'Generated' }] });
        expect(result?.nodes.start?.choices[0]).toEqual({ id: 'authored', label: 'A' });
        expect(result?.nodes.start?.choices[1]?.id).toMatch(/^c_/);
    });
});

describe('connection boundary and default handling', () => {
    it('rejects missing/invalid endpoints and handles missing draft choices', () => {
        const value = tree();
        for (const connection of [
            { source: null, target: 'other', sourceHandle: 'a' },
            { source: 'start', target: null, sourceHandle: 'a' },
            { source: 'missing', target: 'other', sourceHandle: 'a' },
            { source: 'start', target: 'other', sourceHandle: 'missing' },
            { source: 'start', target: 'other', sourceHandle: 'a', targetHandle: 'wrong' },
        ]) expect(isValidEditorConnection(value, connection)).toBe(false);
        expect(isValidEditorConnection(value, { source: 'start', target: 'other', sourceHandle: 'a', targetHandle: null })).toBe(true);
        value.nodes.start = withoutChoices(node());
        expect(isValidEditorConnection(value, { source: 'start', target: 'other', sourceHandle: 'a' })).toBe(false);
    });
    it('keeps authored outcomes when reconnecting or updating a terminal edge', () => {
        const value = tree();
        expect(applyEditorConnect(value, { source: 'start', target: END_NODE_ID, sourceHandle: 'b', targetHandle: '' })?.transitions.find(t => t.id === 'b')?.outcome).toBe('safe');
        expect(applyEditorReconnect(value, { id: 'b', source: 'start', target: END_NODE_ID, sourceHandle: 'b' }, { source: null, target: END_NODE_ID })?.transitions.find(t => t.id === 'b')?.outcome).toBe('safe');
        expect(applyEditorReconnect(value, { id: 'missing', source: 'start', target: 'other', sourceHandle: 'a' }, { source: 'start', target: 'other' })).toBeNull();
        expect(applyEditorReconnect(value, { id: 'a', source: 'start', target: 'other', sourceHandle: '' }, { source: null, target: 'other' })).toBeNull();
    });
});

describe('appearance data boundaries', () => {
    it('ignores malformed edge hint buckets and removes cleared namespaces', () => {
        expect(getChoiceEdgeHints({ id: 'a', label: 'A', render_hints: { editor: [] } })).toEqual({});
        expect(patchChoiceEdgeHints({ id: 'a', label: 'A', render_hints: { editor: false } }, {})).toEqual({ id: 'a', label: 'A', render_hints: { editor: false } });
        expect(patchChoiceEdgeHints({ id: 'a', label: 'A' }, {})).toEqual({ id: 'a', label: 'A' });
    });
    it('averages missing and saved positions and keeps the minimum initial column', () => {
        expect(computeDefaultEndPosition({ start_node: '', nodes: {}, transitions: [] })).toEqual({ x: 700, y: 0 });
        expect(computeDefaultEndPosition(tree())).toEqual({ x: 480, y: 0 });
        expect(resolveEndNodePosition(tree())).toEqual({ x: 480, y: 0 });
        const value = tree(); value.nodes.start = { ...node(), position: { x: 100, y: 20 } };
        expect(computeDefaultEndPosition(value)).toEqual({ x: 520, y: 10 });
    });
    it('preserves all explicit editor appearance values over legacy fallback', () => {
        const theme: NodeEditorHints = { foregroundColor: '#111', fontSize: 14, fontWeight: 400, fontFamily: 'serif', textAlign: 'right' };
        const editor = { foregroundColor: '#222', fontSize: 16, fontWeight: 'bold', fontFamily: 'sans', textAlign: 'left' };
        expect(getEditorHints({ ...node(), render_hints: { theme, editor } })).toEqual(editor);
        expect(getEditorHints({ ...node(), render_hints: { theme } })).toEqual(theme);
        expect(editorHintsToStyle(theme)).toEqual({ color: '#111', fontSize: 14, fontWeight: 400, fontFamily: 'serif', textAlign: 'right' });
        expect(patchEditorHints(node(), { width: undefined }).render_hints).toEqual({});
    });
    it('rejects nonfinite/mistyped hint coordinates and invalid text alignment', () => {
        for (const position of [{ x: 1, y: 'bad' }, { x: Number.NaN, y: 1 }, { x: 1, y: Number.POSITIVE_INFINITY }]) {
            expect(getEditorHints({ ...node(), render_hints: { editor: { graph_position: position } } })).not.toHaveProperty('graph_position');
        }
        expect(getEditorHints({ ...node(), render_hints: { editor: { fontWeight: true, textAlign: 'justify' } } })).toEqual({});
        expect(getEditorHints({ ...node(), render_hints: { theme: { textAlign: 'right' } } }).textAlign).toBe('right');
    });
    it('formats invalid extension values safely without throwing on circular data', () => {
        const circular: Record<string, unknown> = {}; circular.self = circular;
        for (const [width, formatted] of [[{}, '{}'], [true, 'true'], [2n, '2'], [Symbol('width'), ''], [circular, '[unserializable]']]) {
            const value = tree(); value.nodes.start = { ...node(), render_hints: { editor: { width } } };
            expect(lintEditorAppearance(value).some(issue => issue.message === `Node width must be a positive number (got ${String(formatted)}).`)).toBe(true);
        }
    });
});

describe('graph and keyboard edge behavior', () => {
    it('does not reinterpret modified delete keys as document shortcuts', () => {
        expect(getKeyboardShortcutAction({ ctrlKey: false, metaKey: false, shiftKey: false, key: 'delete', hasSelectedNode: true })).toBe('delete');
        expect(getKeyboardShortcutAction({ ctrlKey: false, metaKey: false, shiftKey: false, key: 'backspace', hasSelectedNode: true })).toBe('delete');
    });
    it('lints missing drafts, converging cycles and missing terminal paths without hanging', () => {
        const value = tree(); value.nodes.other = withoutChoices(node('other'));
        value.transitions.push({ id: 'back', fromNodeId: 'other', fromChoiceId: 'b', toNodeId: 'start' });
        expect(lintEditorTree(value).every(issue => issue.message.length > 0)).toBe(true);
        value.start_node = 'missing';
        expect(lintEditorTree(value).some(issue => issue.message.includes("Node 'missing' has paths"))).toBe(true);
    });
    it('lays out cycles, duplicate edges and absent targets without mutating the draft', () => {
        const value = tree();
        value.transitions.push(
            { id: 'cycle', fromNodeId: 'other', fromChoiceId: 'b', toNodeId: 'start' },
            { id: 'duplicate', fromNodeId: 'start', fromChoiceId: 'c', toNodeId: 'other' },
            { id: 'orphan-source', fromNodeId: 'missing', fromChoiceId: 'a', toNodeId: 'other' },
            { id: 'missing-target', fromNodeId: 'other', fromChoiceId: 'c', toNodeId: 'missing' },
        );
        const snapshot = structuredClone(value);
        expect(autoLayoutTree(value).nodes.start?.position).toBeDefined();
        expect(value).toEqual(snapshot);
    });
});

describe('three-way merge unknown extension data', () => {
    it('retains array conflicts for unkeyed opaque choices', () => {
        const baseline = { ...tree(), _meta: { choices: [1] } };
        const local = { ...tree(), _meta: { choices: [2] } };
        const remote = { ...tree(), _meta: { choices: [3] } };
        const result = mergeEditorTrees(baseline, local, remote);
        expect(result).toMatchObject({ kind: 'conflict', conflicts: [{ path: ['_meta', 'choices'] }] });
    });
    it('merges independent transition metadata using fallback source-choice identity', () => {
        const baseline = { ...tree(), _meta: { transitions: [{ fromNodeId: 'n', fromChoiceId: 'a', label: 'before' }] } };
        const local = { ...tree(), _meta: { transitions: [{ fromNodeId: 'n', fromChoiceId: 'a', label: 'after' }] } };
        const remote = { ...tree(), _meta: { transitions: [{ fromNodeId: 'n', fromChoiceId: 'a', label: 'before' }, { fromNodeId: 'n', fromChoiceId: 'b' }] } };
        expect(mergeEditorTrees(baseline, local, remote)).toMatchObject({ kind: 'merged', value: { _meta: { transitions: [{ label: 'after' }, { fromChoiceId: 'b' }] } } });
    });
    it('preserves deletions while merging independent record additions', () => {
        const baseline = { ...tree(), _meta: { shared: { remove: 1, keep: true } } };
        const local = { ...tree(), _meta: { shared: { keep: true, local: 2 } } };
        const remote = { ...tree(), _meta: { shared: { remove: 1, keep: true, remote: 3 } } };
        expect(mergeEditorTrees(baseline, local, remote)).toMatchObject({ kind: 'merged', value: { _meta: { shared: { keep: true, local: 2, remote: 3 } } } });
    });
});


it('lints duplicate traversal entries and legacy empty source identities without looping', () => {
    const value = tree();
    value.transitions.push(
        { id: 'duplicate-target', fromNodeId: 'start', fromChoiceId: 'c', toNodeId: 'other' },
        { id: 'empty-source', fromNodeId: '', fromChoiceId: 'a', toNodeId: END_NODE_ID, outcome: 'safe' },
    );
    const issues = lintEditorTree(value);
    expect(issues.some(issue => issue.node_id === 'start' && issue.message.includes('do not reach END'))).toBe(false);
});

it('preserves locked nodes without saved positions and ignores blank source edges', () => {
    const value = tree();
    value.nodes.locked = { ...node('locked'), render_hints: { editor: { locked: true } } };
    value.nodes[''] = node('');
    value.transitions.push(
        { id: 'blank-source', fromNodeId: '', fromChoiceId: 'a', toNodeId: 'start' },
        { id: 'same-terminal', fromNodeId: 'start', fromChoiceId: 'c', toNodeId: END_NODE_ID, outcome: 'safe' },
    );
    expect(autoLayoutTree(value).nodes.locked?.position).toBeUndefined();
});

it('keeps malformed keyed extension arrays as conflicts rather than silently merging them', () => {
    const valid = [{ id: 'a', label: 'Before' }];
    const altered = [{ id: 'a', label: 'After' }];
    const extra = [{ id: 'a', label: 'Before' }, { id: 'b' }];
    const cases: ReadonlyArray<readonly [unknown, unknown, unknown]> = [
        [[{ label: 'No ID' }], altered, extra],
        [valid, [{ label: 'No ID' }], extra],
        [valid, altered, [{ label: 'No ID' }]],
    ];
    for (const [base, local, remote] of cases) {
        expect(mergeEditorTrees({ ...tree(), _meta: { choices: base } }, { ...tree(), _meta: { choices: local } }, { ...tree(), _meta: { choices: remote } })).toMatchObject({ kind: 'conflict' });
    }
    for (const invalid of [{ fromNodeId: 2 }, { fromNodeId: 'n' }]) {
        expect(mergeEditorTrees({ ...tree(), _meta: { transitions: [invalid] } }, { ...tree(), _meta: { transitions: altered } }, { ...tree(), _meta: { transitions: extra } })).toMatchObject({ kind: 'conflict' });
    }
});

it('merges independently introduced records and keyed arrays and reports overlapping additions', () => {
    const base = tree();
    const local = { ...tree(), _meta: { record: { local: true }, choices: [{ id: 'local' }] } };
    const remote = { ...tree(), _meta: { record: { remote: true }, choices: [{ id: 'remote' }] } };
    expect(mergeEditorTrees(base, local, remote)).toMatchObject({ kind: 'merged', value: { _meta: { record: { local: true, remote: true }, choices: [{ id: 'local' }, { id: 'remote' }] } } });
    expect(mergeEditorTrees(base, { ...tree(), _meta: { shared: 'local' } }, { ...tree(), _meta: { shared: 'remote' } })).toMatchObject({ kind: 'conflict', conflicts: [{ baseline: undefined, local: 'local', remote: 'remote' }] });
    expect(mergeEditorTrees({ ...tree(), _meta: { shared: 'before' } }, { ...tree(), _meta: { shared: 'after' } }, { ...tree(), _meta: {} })).toMatchObject({ kind: 'conflict', conflicts: [{ remote: undefined }] });
});

it('keeps matching concurrent reorders with independent edits and omits deleted items', () => {
    const choices = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }];
    const base = { ...tree(), _meta: { choices } };
    const local = { ...tree(), _meta: { choices: [{ id: 'c', label: 'C' }, { id: 'b', label: 'B' }, { id: 'a', label: 'Local' }] } };
    const remote = { ...tree(), _meta: { choices: [{ id: 'c', label: 'C' }, { id: 'b', label: 'Remote' }, { id: 'a', label: 'A' }] } };
    expect(mergeEditorTrees(base, local, remote)).toMatchObject({ kind: 'merged', value: { _meta: { choices: [{ id: 'c' }, { id: 'b', label: 'Remote' }, { id: 'a', label: 'Local' }] } } });
    expect(mergeEditorTrees(base, { ...tree(), _meta: { choices: choices.slice(1) } }, { ...tree(), _meta: { choices: [choices[0], { id: 'b', label: 'Remote' }, choices[2]] } })).toMatchObject({ kind: 'merged', value: { _meta: { choices: [{ id: 'b', label: 'Remote' }, { id: 'c' }] } } });
});


it('rejects invalid connections and leaves selected unrelated keys unhandled', () => {
    expect(applyEditorConnect(tree(), { source: null, target: null })).toBeNull();
    expect(getKeyboardShortcutAction({ ctrlKey: false, metaKey: false, shiftKey: false, key: 'x', hasSelectedNode: true })).toBeNull();
    expect(editorHintsToStyle({})).toEqual({});
    expect(needsInitialLayout({ start_node: '', nodes: {}, transitions: [] })).toBe(false);
});

it('keeps colliding locked node positions unchanged', () => {
    const value = tree();
    for (const entry of Object.values(value.nodes)) {
        entry.position = { x: 40, y: 40 };
        entry.render_hints = { editor: { locked: true } };
    }
    expect(autoLayoutTree(value).nodes.start?.position).toEqual({ x: 40, y: 40 });
    expect(autoLayoutTree(value).nodes.other?.position).toEqual({ x: 40, y: 40 });
});

it('validates choice appearance independently of parent hints and tolerates draft fields', () => {
    const value = tree();
    value.nodes.start = { ...node(), choices: [{ id: 'bad', label: 'Bad', render_hints: { editor: { edgeType: 'bezier', strokeColor: 12 } } }] };
    expect(lintEditorAppearance(value).filter(issue => issue.choice_id === 'bad')).toHaveLength(2);
    value.nodes.start = withoutChoices({ ...node(), render_hints: {} });
    value._meta = { graph_editor: 'invalid bucket' };
    expect(lintEditorAppearance(value)).toEqual([]);
});

it('reports keyed item conflicts and non-keyed array conflicts while coalescing matching edits', () => {
    const base = { ...tree(), _meta: { choices: [{ id: 'a', label: 'Before' }], list: [1] } };
    const local = { ...tree(), _meta: { choices: [{ id: 'a', label: 'Local' }], list: [2] } };
    const remote = { ...tree(), _meta: { choices: [{ id: 'a', label: 'Remote' }], list: [3] } };
    expect(mergeEditorTrees(base, local, remote)).toMatchObject({ kind: 'conflict', conflicts: [{ path: ['_meta', 'choices', 'a', 'label'] }, { path: ['_meta', 'list'] }] });
    expect(mergeEditorTrees(tree(), local, structuredClone(local))).toMatchObject({ kind: 'merged', value: local });
});

it('handles incomplete legacy nodes when diffing and duplicating', () => {
    const before = tree(); const after = tree();
    before.nodes.start = withoutChoices(node());
    expect(computeTreeDiffSummary(before, after).hasChanges).toBe(true);
    after.nodes.start = withoutChoices(node());
    expect(computeTreeDiffSummary(before, after).hasChanges).toBe(false);
    Reflect.set(before.nodes, 'broken', undefined);
    Reflect.set(after.nodes, 'broken', undefined);
    expect(computeTreeDiffSummary(before, after).hasChanges).toBe(false);
    const copy = duplicateNode(after, 'start');
    expect(copy?.nextTree.nodes[copy.nextNodeId]).toMatchObject({ choices: [], position: { x: 40, y: 40 } });
});

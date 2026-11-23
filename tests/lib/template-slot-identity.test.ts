import { expect, it } from 'vitest';
import { END_NODE_ID, type EditorTree } from '../../src/model';
import { applyTreeTemplate, type TreeTemplateSpec } from '../../src/lib/treeOperations';

it('keeps authored prototype-like slot names as distinct string identities', () => {
    const baseline: EditorTree = { start_node: '', nodes: {}, transitions: [] };
    const nodeSpec = { type: 'prompt', prompt: 'Choose', choices: [{ id: 'go', label: 'Go' }] };
    const spec: TreeTemplateSpec = {
        focusSlot: '__proto__',
        nodes: Object.fromEntries([['__proto__', nodeSpec], ['constructor', nodeSpec], ['toString', nodeSpec]]),
        transitions: [
            { fromSlot: '__proto__', fromChoiceId: 'go', toSlot: 'constructor' },
            { fromSlot: 'constructor', fromChoiceId: 'go', toSlot: 'toString' },
            { fromSlot: 'toString', fromChoiceId: 'go', toSlot: END_NODE_ID, outcome: 'safe' },
        ],
    };
    const result = applyTreeTemplate(baseline, spec);
    expect(typeof result.focusNodeId).toBe('string');
    expect(result.nextTree.start_node).toBe(result.focusNodeId);
    expect(Object.keys(result.nextTree.nodes)).toHaveLength(3);
    expect(result.nextTree.transitions[0]?.fromNodeId).toBe(result.focusNodeId);
    expect(result.nextTree.transitions[0]?.toNodeId).toBe(result.nextTree.transitions[1]?.fromNodeId);
    expect(result.nextTree.transitions[1]?.toNodeId).toBe(result.nextTree.transitions[2]?.fromNodeId);
    expect(result.nextTree.transitions[2]?.toNodeId).toBe(END_NODE_ID);
    expect(baseline).toEqual({ start_node: '', nodes: {}, transitions: [] });
});

import { END_NODE_ID } from '@signalsafe/tree-spec';
import { describe, expect, it } from 'vitest';
import type { TreeSpecWire } from '@signalsafe/tree-spec';
import { coerceTreeSpecWireForEditor } from '../../src/lib/coerceTreeSpecWire';

function validWire(overrides: Partial<TreeSpecWire> = {}): TreeSpecWire {
    return {
        wire_version: 1,
        start_node: 's',
        nodes: { s: { type: 'prompt', prompt: 'Hi', choices: [] } },
        transitions: [],
        ...overrides,
    };
}

describe('coerceTreeSpecWireForEditor', () => {
    it('bootstraps undefined into a starter wire with one empty prompt node', () => {
        const spec = coerceTreeSpecWireForEditor(undefined);
        expect(spec).not.toBeNull();
        expect(spec?.wire_version).toBe(1);
        expect(spec?.nodes[spec.start_node]).toBeDefined();
        expect(spec?.nodes[spec.start_node]?.type).toBe('prompt');
    });

    it('bootstraps null into a starter wire with a generated start_node id', () => {
        const spec = coerceTreeSpecWireForEditor(null);
        expect(spec).not.toBeNull();
        if (!spec) return;
        expect(spec.wire_version).toBe(1);
        expect(spec.start_node).toMatch(/^n_[0-9a-f]{8}$/i);
        expect(Object.keys(spec.nodes)).toEqual([spec.start_node]);
        expect(spec.nodes[spec.start_node]?.type).toBe('prompt');
        expect(spec.transitions).toEqual([]);
    });

    it('bootstraps an empty plain object into a starter wire', () => {
        const spec = coerceTreeSpecWireForEditor({});
        expect(spec).not.toBeNull();
        expect(spec?.nodes[spec.start_node]).toBeDefined();
    });

    it('bootstraps non-object primitives into a starter wire', () => {
        const spec = coerceTreeSpecWireForEditor(42);
        expect(spec).not.toBeNull();
        expect(spec?.nodes[spec.start_node]).toBeDefined();
    });

    it('passes a valid TreeSpecWire through unchanged', () => {
        const wire = validWire();
        expect(coerceTreeSpecWireForEditor(wire)).toEqual(wire);
    });

    it('bootstraps a wire-shaped payload with no nodes into a starter wire', () => {
        const wire = validWire({ nodes: {}, start_node: 's' });
        const spec = coerceTreeSpecWireForEditor(wire);
        expect(spec).not.toBeNull();
        expect(spec).not.toEqual(wire);
        expect(spec?.nodes[spec.start_node]).toBeDefined();
    });

    it('bootstraps a wire-shaped payload with a missing start_node into a starter wire', () => {
        const wire = validWire({ start_node: '' });
        const spec = coerceTreeSpecWireForEditor(wire);
        expect(spec).not.toBeNull();
        expect(spec?.start_node).toMatch(/^n_[0-9a-f]{8}$/i);
    });

    it('returns null when the wire has lint errors', () => {
        const wire = validWire({
            transitions: [{ from: ['s', 'c1'], to: END_NODE_ID }],
        });
        expect(coerceTreeSpecWireForEditor(wire)).toBeNull();
    });

    it('returns null for non-empty invalid JSON objects (cannot infer intent)', () => {
        expect(coerceTreeSpecWireForEditor({ not_wire: true })).toBeNull();
    });

    it('returns null for arrays (not a valid wire shape, not an empty starter)', () => {
        expect(coerceTreeSpecWireForEditor([])).toBeNull();
    });
});

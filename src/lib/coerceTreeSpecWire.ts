import {
    isTreeSpecWire,
    lintTreeSpecWire,
    TREE_SPEC_ISSUE_SEVERITY,
    TREESPEC_WIRE_VERSION,
    type TreeSpecWire,
} from '@signalsafe/tree-spec';

import { newEditorNodeId } from './idHelpers.js';

function createStarterWire(): TreeSpecWire {
    const startId = newEditorNodeId();
    return {
        wire_version: TREESPEC_WIRE_VERSION,
        start_node: startId,
        nodes: {
            [startId]: {
                type: 'prompt',
                prompt: '',
                choices: [],
                render_hints: {},
            },
        },
        transitions: [],
    };
}

/**
 * Pass valid wires through; bootstrap a minimal starter graph for empty payloads.
 * Returns `null` when the payload is present but structurally invalid.
 */
export function coerceTreeSpecWireForEditor(raw: unknown): TreeSpecWire | null {
    if (raw == null) return createStarterWire();
    if (Array.isArray(raw)) return null;
    if (typeof raw !== 'object') return createStarterWire();

    const obj = raw as Record<string, unknown>;
    if (Object.keys(obj).length === 0) return createStarterWire();

    if (!isTreeSpecWire(raw)) return null;

    const nodes = raw.nodes;
    if (!nodes || Object.keys(nodes).length === 0 || !raw.start_node) {
        return createStarterWire();
    }

    const errors = lintTreeSpecWire(raw).filter((i) => i.severity === TREE_SPEC_ISSUE_SEVERITY.ERROR);
    if (errors.length > 0) return null;
    return raw;
}

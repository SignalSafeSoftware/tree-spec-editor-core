export {
    END_NODE_ID,
    type TreeGraphChoice as EditorChoice,
    type TreeGraphNode as EditorNode,
    type TreeGraphTransition as EditorTransition,
    type TreeGraph as EditorTree,
} from '@signalsafe/tree-spec';

/**
 * Selection kinds the graph editor can report. `null` is also a valid kind
 * value (meaning "nothing selected"); we keep that as a separate sentinel
 * rather than a constant so editors can compare with strict equality.
 */
export const GRAPH_SELECTION_KIND = {
    NODE: 'node',
    EDGE: 'edge',
} as const;

/** Non-null selection kind values. Derived from {@link GRAPH_SELECTION_KIND}. */
export type GraphSelectionKind = (typeof GRAPH_SELECTION_KIND)[keyof typeof GRAPH_SELECTION_KIND];

/** Selection in the graph editor (node or edge, with id). */
export type GraphSelection = { kind: GraphSelectionKind | null; id: string | null };

/** ReactFlow nodes change entry (type, dragging). */
export interface ReactFlowNodeChange {
    type?: string;
    dragging?: boolean;
}

/** ReactFlow edges change entry (type). */
export interface ReactFlowEdgeChange {
    type?: string;
}

/** Validation/issue entry for graph editor (severity, message, optional node/choice). */
export interface GraphEditorIssue {
    severity: string;
    message: string;
    node_id?: string;
    choice_id?: string;
}

/**
 * Snapshot row shown in the draft-history modal.
 * Hosts return arrays of these from their snapshot-list adapter method.
 */
export interface TreeSpecSnapshotItem {
    id: string;
    created_on: string;
    label?: string;
    spec_hash?: string;
}

/**
 * Audit event row shown in the audit-log modal.
 * `actor` accepts either a numeric user id or any string identifier so the modal
 * works regardless of how the host represents actors.
 */
export interface TreeSpecAuditEventItem {
    id: string;
    action: string;
    actor?: string | number;
    detail?: Record<string, unknown>;
    created_on: string;
}

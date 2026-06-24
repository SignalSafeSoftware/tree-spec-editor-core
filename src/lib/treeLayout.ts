import dagre from 'dagre';

import { END_NODE_ID, type EditorNode, type EditorTree } from '../model.js';
import { patchGraphEditorMeta } from './graphEditorLayout.js';
import { DEFAULT_GRAPH_NODE_WIDTH, isNodeLocked } from './nodeHints.js';

/** Canvas snap grid used by auto-layout and the React Flow editor. */
export const LAYOUT_SNAP_GRID = 20;

/** Approximate END card width on the canvas (matches `w-180`). */
export const END_LAYOUT_WIDTH = 180;

/** Default node height estimate for dagre spacing. */
export const DEFAULT_NODE_LAYOUT_HEIGHT = 140;

const UNREACHABLE_COLUMN_OFFSET = 420;
const COLLISION_MIN_GAP = 20;

/** Next default position for a newly added node (simple grid down the canvas). */
export function getNextSpawnPosition(tree: EditorTree): { x: number; y: number } {
    const count = Object.keys(tree.nodes).length;
    return { x: 80, y: 80 + count * 44 };
}

export function snapToGrid(value: number, grid = LAYOUT_SNAP_GRID): number {
    return Math.round(value / grid) * grid;
}

export function snapPosition(position: { x: number; y: number }): { x: number; y: number } {
    return { x: snapToGrid(position.x), y: snapToGrid(position.y) };
}

function isOriginPosition(position: { x: number; y: number } | undefined): boolean {
    if (!position) return true;
    return position.x === 0 && position.y === 0;
}

/**
 * True when every node lacks a layout or is stacked at the canvas origin —
 * typical for specs loaded before graph positions were persisted.
 */
export function needsInitialLayout(tree: EditorTree): boolean {
    const nodes = Object.values(tree.nodes);
    if (nodes.length === 0) return false;
    return nodes.every((n) => isOriginPosition(n.position));
}

function collectReachableInterNode(tree: EditorTree): Set<string> {
    const reachable = new Set<string>();
    const stack = [tree.start_node];

    while (stack.length > 0) {
        const id = stack.pop();
        if (!id || reachable.has(id) || !tree.nodes[id]) continue;
        reachable.add(id);
        enqueueReachableTransitionTargets(tree, id, reachable, stack);
    }

    return reachable;
}

function enqueueReachableTransitionTargets(
    tree: EditorTree,
    fromId: string,
    reachable: Set<string>,
    stack: string[],
): void {
    for (const transition of tree.transitions) {
        if (transition.fromNodeId !== fromId) continue;
        const nextId = transition.toNodeId;
        if (!nextId || nextId === END_NODE_ID || !tree.nodes[nextId] || reachable.has(nextId)) {
            continue;
        }
        stack.push(nextId);
    }
}

function rectsOverlap(
    a: { x: number; y: number },
    b: { x: number; y: number },
    width: number,
    height: number,
    gap: number,
): boolean {
    return !(
        a.x + width + gap <= b.x ||
        b.x + width + gap <= a.x ||
        a.y + height + gap <= b.y ||
        b.y + height + gap <= a.y
    );
}

function chooseCollisionMoveNode(aNode: EditorNode, bNode: EditorNode): EditorNode {
    if (isNodeLocked(bNode) && !isNodeLocked(aNode)) {
        return aNode;
    }
    return bNode;
}

function nudgeCollisionPair(aNode: EditorNode, bNode: EditorNode): boolean {
    if (!aNode.position || !bNode.position) return false;
    if (
        !rectsOverlap(
            aNode.position,
            bNode.position,
            DEFAULT_GRAPH_NODE_WIDTH,
            DEFAULT_NODE_LAYOUT_HEIGHT,
            COLLISION_MIN_GAP,
        )
    ) {
        return false;
    }

    const moveNode = chooseCollisionMoveNode(aNode, bNode);
    if (isNodeLocked(moveNode) || !moveNode.position) return false;

    moveNode.position = snapPosition({
        x: moveNode.position.x,
        y: moveNode.position.y + DEFAULT_NODE_LAYOUT_HEIGHT + COLLISION_MIN_GAP,
    });
    return true;
}

function nudgeCollisions(nodes: Record<string, EditorNode>): void {
    const ids = Object.keys(nodes);
    let changed = true;
    let guard = 0;

    while (changed && guard < 100) {
        changed = false;
        guard += 1;

        for (let i = 0; i < ids.length; i += 1) {
            for (let j = i + 1; j < ids.length; j += 1) {
                const aId = ids[i];
                const bId = ids[j];
                if (!aId || !bId) continue;
                const aNode = nodes[aId];
                const bNode = nodes[bId];
                if (!aNode || !bNode) continue;
                if (nudgeCollisionPair(aNode, bNode)) {
                    changed = true;
                }
            }
        }
    }
}

function addDagreTransitionEdge(
    graph: dagre.graphlib.Graph,
    transition: EditorTree['transitions'][number],
    reachable: Set<string>,
    includeEndSink: boolean,
    edgePairs: Set<string>,
): void {
    const from = transition.fromNodeId;
    const to = transition.toNodeId;
    if (!from || !to || !reachable.has(from)) return;

    if (to === END_NODE_ID) {
        if (!includeEndSink) return;
        const pair = `${from}->${END_NODE_ID}`;
        if (edgePairs.has(pair)) return;
        edgePairs.add(pair);
        graph.setEdge(from, END_NODE_ID);
        return;
    }

    if (!reachable.has(to)) return;
    const pair = `${from}->${to}`;
    if (edgePairs.has(pair)) return;
    edgePairs.add(pair);
    graph.setEdge(from, to);
}

function layoutWithDagre(
    tree: EditorTree,
    reachable: Set<string>,
    includeEndSink: boolean,
): Map<string, { x: number; y: number }> {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 140, marginx: 40, marginy: 40 });

    for (const id of reachable) {
        g.setNode(id, { width: DEFAULT_GRAPH_NODE_WIDTH, height: DEFAULT_NODE_LAYOUT_HEIGHT });
    }

    if (includeEndSink) {
        g.setNode(END_NODE_ID, { width: END_LAYOUT_WIDTH, height: 80 });
    }

    const edgePairs = new Set<string>();
    for (const transition of tree.transitions) {
        addDagreTransitionEdge(g, transition, reachable, includeEndSink, edgePairs);
    }

    dagre.layout(g);

    const positions = new Map<string, { x: number; y: number }>();
    for (const id of g.nodes()) {
        const layoutNode = g.node(id);
        if (!layoutNode) continue;
        const width = id === END_NODE_ID ? END_LAYOUT_WIDTH : DEFAULT_GRAPH_NODE_WIDTH;
        const height = id === END_NODE_ID ? 80 : DEFAULT_NODE_LAYOUT_HEIGHT;
        positions.set(
            id,
            snapPosition({
                x: layoutNode.x - width / 2,
                y: layoutNode.y - height / 2,
            }),
        );
    }

    return positions;
}

/**
 * Assign node positions using dagre (left-to-right), END as a virtual sink,
 * unreachable nodes in a trailing column, snap grid, and collision nudge.
 */
export function autoLayoutTree(tree: EditorTree): EditorTree {
    if (!tree.start_node || !tree.nodes[tree.start_node]) {
        return { ...tree, nodes: { ...tree.nodes } };
    }

    const reachable = collectReachableInterNode(tree);
    const hasEndTarget = tree.transitions.some((transition) => transition.toNodeId === END_NODE_ID);
    const dagrePositions = layoutWithDagre(tree, reachable, hasEndTarget);

    const nextNodes: Record<string, EditorNode> = Object.fromEntries(
        Object.entries(tree.nodes).map(([id, node]) => [id, { ...node }]),
    );

    let maxX = 0;
    for (const [id, position] of dagrePositions.entries()) {
        if (id === END_NODE_ID) continue;
        const node = nextNodes[id];
        if (!node || isNodeLocked(node)) continue;
        node.position = position;
        maxX = Math.max(maxX, position.x);
    }

    const unreachableIds = Object.keys(tree.nodes)
        .filter((id) => !reachable.has(id))
        .sort((left, right) => left.localeCompare(right));

    const orphanX = snapToGrid(maxX + UNREACHABLE_COLUMN_OFFSET);
    unreachableIds.forEach((id, index) => {
        const node = nextNodes[id];
        if (!node || isNodeLocked(node)) return;
        node.position = snapPosition({ x: orphanX, y: 40 + index * 180 });
    });

    nudgeCollisions(nextNodes);

    let nextTree: EditorTree = { ...tree, nodes: nextNodes };
    const endPosition = dagrePositions.get(END_NODE_ID);
    if (endPosition) {
        nextTree = patchGraphEditorMeta(nextTree, { end_position: endPosition });
    }

    return nextTree;
}

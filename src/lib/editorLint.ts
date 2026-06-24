import type { TreeSpecIssue } from '@signalsafe/tree-spec';

import { END_NODE_ID, type EditorTree } from '../model.js';
import { lintEditorAppearance } from './lintEditorAppearance.js';

function buildTransitionMap(tree: EditorTree): Map<string, string> {
    const map = new Map<string, string>();
    for (const tr of tree.transitions) {
        map.set(`${tr.fromNodeId}::${tr.fromChoiceId}`, tr.toNodeId);
    }
    return map;
}

function lintDuplicateTransitions(tree: EditorTree): TreeSpecIssue[] {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const tr of tree.transitions) {
        const key = `${tr.fromNodeId}::${tr.fromChoiceId}`;
        if (seen.has(key)) dupes.add(key);
        else seen.add(key);
    }
    return [...dupes].map((key) => {
        const [node_id, choice_id] = key.split('::');
        return {
            severity: 'error',
            message: `Duplicate transition for choice '${choice_id}' on node '${node_id}'.`,
            node_id,
            choice_id,
        };
    });
}

function lintMissingTransitions(tree: EditorTree, transMap: Map<string, string>): TreeSpecIssue[] {
    const issues: TreeSpecIssue[] = [];
    for (const [nodeId, node] of Object.entries(tree.nodes)) {
        for (const choice of node.choices ?? []) {
            if (transMap.has(`${nodeId}::${choice.id}`)) continue;
            issues.push({
                severity: 'error',
                message: `Missing transition for choice '${choice.id}' on node '${nodeId}'.`,
                node_id: nodeId,
                choice_id: choice.id,
            });
        }
    }
    return issues;
}

function lintMissingTargetNodes(tree: EditorTree, transMap: Map<string, string>): TreeSpecIssue[] {
    const issues: TreeSpecIssue[] = [];
    for (const [key, toNodeId] of transMap.entries()) {
        if (toNodeId === END_NODE_ID || tree.nodes[toNodeId]) continue;
        const [node_id, choice_id] = key.split('::');
        issues.push({
            severity: 'error',
            message: `Transition (${node_id}, ${choice_id}) points to missing node '${toNodeId}'.`,
            node_id,
            choice_id,
        });
    }
    return issues;
}

function collectReachableNodes(tree: EditorTree, transMap: Map<string, string>): Set<string> {
    const reachable = new Set<string>();
    const stack = [tree.start_node];
    while (stack.length > 0) {
        const nodeId = stack.pop()!;
        if (reachable.has(nodeId)) continue;
        reachable.add(nodeId);
        const node = tree.nodes[nodeId];
        if (!node) continue;
        for (const choice of node.choices ?? []) {
            const nextNode = transMap.get(`${nodeId}::${choice.id}`);
            if (!nextNode || nextNode === END_NODE_ID || reachable.has(nextNode)) continue;
            stack.push(nextNode);
        }
    }
    return reachable;
}

function lintUnreachableNodes(tree: EditorTree, reachable: Set<string>): TreeSpecIssue[] {
    return Object.keys(tree.nodes)
        .filter((nodeId) => !reachable.has(nodeId))
        .map((node_id) => ({
            severity: 'warning',
            message: `Node '${node_id}' is unreachable from start node '${tree.start_node}'.`,
            node_id,
        }));
}

function nodeCanReachEnd(
    tree: EditorTree,
    transMap: Map<string, string>,
    nodeId: string,
    visiting: Set<string>,
): boolean {
    if (nodeId === END_NODE_ID) return true;
    const node = tree.nodes[nodeId];
    if (!node) return false;
    if (visiting.has(nodeId)) return false;

    visiting.add(nodeId);
    const choices = node.choices ?? [];
    if (choices.length === 0) {
        visiting.delete(nodeId);
        return false;
    }

    for (const choice of choices) {
        const toNodeId = transMap.get(`${nodeId}::${choice.id}`);
        if (!toNodeId) {
            visiting.delete(nodeId);
            return false;
        }
        if (toNodeId === END_NODE_ID) continue;
        if (!nodeCanReachEnd(tree, transMap, toNodeId, visiting)) {
            visiting.delete(nodeId);
            return false;
        }
    }

    visiting.delete(nodeId);
    return true;
}

function lintPathsMustReachEnd(tree: EditorTree, reachable: Set<string>, transMap: Map<string, string>): TreeSpecIssue[] {
    const issues: TreeSpecIssue[] = [];
    for (const nodeId of reachable) {
        if (nodeCanReachEnd(tree, transMap, nodeId, new Set())) continue;
        issues.push({
            severity: 'error',
            message: `Node '${nodeId}' has paths that do not reach END.`,
            node_id: nodeId,
        });
    }
    return issues;
}

/** Extra structural checks on the decompiled editor tree (beyond wire lint). */
export function lintEditorTree(t: EditorTree): TreeSpecIssue[] {
    const issues: TreeSpecIssue[] = [];
    const transMap = buildTransitionMap(t);

    issues.push(
        ...lintDuplicateTransitions(t),
        ...lintMissingTransitions(t, transMap),
        ...lintMissingTargetNodes(t, transMap),
    );

    const reachable = collectReachableNodes(t, transMap);
    issues.push(...lintUnreachableNodes(t, reachable));
    issues.push(...lintPathsMustReachEnd(t, reachable, transMap));

    for (const tr of t.transitions) {
        if (tr.toNodeId === END_NODE_ID && !tr.outcome) {
            issues.push({
                severity: 'error',
                message: 'Transition to END is missing outcome (safe / at_risk / compromised).',
                node_id: tr.fromNodeId,
                choice_id: tr.fromChoiceId,
            });
        }
    }
    return [...issues, ...lintEditorAppearance(t)];
}

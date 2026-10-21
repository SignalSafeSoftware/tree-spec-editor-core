import type { EditorTree } from '../model.js';

const MISSING = Symbol('tree-merge-missing');
type MergePath = readonly (string | number)[];
type MergeOutcome =
    | { readonly kind: 'value'; readonly value: unknown }
    | { readonly kind: 'conflicts'; readonly conflicts: readonly TreeMergeConflict[] };

export interface TreeMergeConflict {
    readonly path: MergePath;
    readonly baseline: unknown;
    readonly local: unknown;
    readonly remote: unknown;
}

export type TreeMergeResult =
    | { readonly kind: 'merged'; readonly value: EditorTree }
    | { readonly kind: 'conflict'; readonly conflicts: readonly TreeMergeConflict[] };

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== MISSING && value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isArray(value: unknown): value is readonly unknown[] {
    return Array.isArray(value);
}

function equalValue(left: unknown, right: unknown): boolean {
    if (left === MISSING || right === MISSING) return left === right;
    return JSON.stringify(left) === JSON.stringify(right);
}

function recordValue(record: Record<string, unknown>, key: string): unknown {
    return Object.hasOwn(record, key) ? record[key] : MISSING;
}

function conflict(path: MergePath, baseline: unknown, local: unknown, remote: unknown): TreeMergeConflict {
    return {
        path,
        baseline: baseline === MISSING ? undefined : baseline,
        local: local === MISSING ? undefined : local,
        remote: remote === MISSING ? undefined : remote,
    };
}

function keyedArray(values: readonly unknown[], path: MergePath): Map<string, unknown> | null {
    const result = new Map<string, unknown>();
    for (const value of values) {
        if (!isRecord(value)) return null;
        const key = arrayItemKey(value, path);
        if (key === null || result.has(key)) return null;
        result.set(key, value);
    }
    return result;
}

function arrayItemKey(value: Record<string, unknown>, path: MergePath): string | null {
    if (path.at(-1) === 'transitions') return transitionKey(value);
    return typeof value.id === 'string' ? value.id : null;
}

function transitionKey(value: Record<string, unknown>): string | null {
    if (typeof value.id === 'string') return value.id;
    if (typeof value.fromNodeId !== 'string' || typeof value.fromChoiceId !== 'string') return null;
    return `${value.fromNodeId}\u0000${value.fromChoiceId}`;
}

function mergeKeyedArrays(
    baseline: readonly unknown[],
    local: readonly unknown[],
    remote: readonly unknown[],
    path: MergePath,
): MergeOutcome {
    const baselineMap = keyedArray(baseline, path);
    const localMap = keyedArray(local, path);
    const remoteMap = keyedArray(remote, path);
    if (baselineMap === null || localMap === null || remoteMap === null) {
        return { kind: 'conflicts', conflicts: [conflict(path, baseline, local, remote)] };
    }

    const baselineIds = [...baselineMap.keys()];
    const localIds = [...localMap.keys()];
    const remoteIds = [...remoteMap.keys()];
    const order = keyedArrayOrder(baselineIds, localIds, remoteIds);
    if (order === null) {
        return { kind: 'conflicts', conflicts: [conflict(path, baseline, local, remote)] };
    }

    const ids = new Set([...baselineIds, ...localIds, ...remoteIds]);
    const merged = new Map<string, unknown>();
    const conflicts: TreeMergeConflict[] = [];
    for (const id of ids) {
        const result = mergeValue(
            mapValue(baselineMap, id),
            mapValue(localMap, id),
            mapValue(remoteMap, id),
            [...path, id],
        );
        if (result.kind === 'conflicts') conflicts.push(...result.conflicts);
        else if (result.value !== MISSING) merged.set(id, result.value);
    }
    if (conflicts.length > 0) return { kind: 'conflicts', conflicts };

    for (const id of ids) if (!order.includes(id)) order.push(id);
    return {
        kind: 'value',
        value: order.flatMap((id) => {
            const value = merged.get(id);
            return value === undefined ? [] : [value];
        }),
    };
}

function keyedArrayOrder(baselineIds: string[], localIds: string[], remoteIds: string[]): string[] | null {
    const localSet = new Set(localIds);
    const remoteSet = new Set(remoteIds);
    const commonIds = new Set(baselineIds.filter((id) => localSet.has(id) && remoteSet.has(id)));
    const localCommonIds = localIds.filter((id) => commonIds.has(id));
    const remoteCommonIds = remoteIds.filter((id) => commonIds.has(id));
    const baselineCommonIds = baselineIds.filter((id) => commonIds.has(id));
    const localOrderChanged = !sameArray(localCommonIds, baselineCommonIds);
    const remoteOrderChanged = !sameArray(remoteCommonIds, baselineCommonIds);
    if (localOrderChanged && remoteOrderChanged && !sameArray(localCommonIds, remoteCommonIds)) {
        return null;
    }

    if (localOrderChanged) return localIds;
    if (remoteOrderChanged) return remoteIds;
    return baselineIds;
}

function mapValue(values: ReadonlyMap<string, unknown>, id: string): unknown {
    return values.has(id) ? values.get(id) : MISSING;
}

function sameArray(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function mergeValue(
    baseline: unknown,
    local: unknown,
    remote: unknown,
    path: MergePath,
): MergeOutcome {
    if (equalValue(local, baseline)) return { kind: 'value', value: cloneValue(remote) };
    if (equalValue(remote, baseline)) return { kind: 'value', value: cloneValue(local) };
    if (equalValue(local, remote)) return { kind: 'value', value: cloneValue(local) };

    if (isRecord(local) && isRecord(remote)) {
        const baseRecord = isRecord(baseline) ? baseline : {};
        return mergeRecordValues(baseRecord, local, remote, path);
    }
    if (isArray(local) && isArray(remote)) {
        const baseArray = isArray(baseline) ? baseline : [];
        if (path.at(-1) === 'choices' || path.at(-1) === 'transitions') {
            return mergeKeyedArrays(baseArray, local, remote, path);
        }
    }
    return { kind: 'conflicts', conflicts: [conflict(path, baseline, local, remote)] };
}

function mergeRecordValues(
    baseline: Record<string, unknown>,
    local: Record<string, unknown>,
    remote: Record<string, unknown>,
    path: MergePath,
): MergeOutcome {
    const merged: Record<string, unknown> = { ...remote };
    const conflicts: TreeMergeConflict[] = [];
    for (const key of new Set([...Object.keys(baseline), ...Object.keys(local), ...Object.keys(remote)])) {
        const result = mergeValue(recordValue(baseline, key), recordValue(local, key), recordValue(remote, key), [...path, key]);
        if (result.kind === 'conflicts') conflicts.push(...result.conflicts);
        else if (result.value === MISSING) delete merged[key];
        else merged[key] = result.value;
    }
    if (conflicts.length > 0) return { kind: 'conflicts', conflicts };
    return { kind: 'value', value: merged };
}

function cloneValue(value: unknown): unknown {
    return value === MISSING ? MISSING : structuredClone(value);
}

/** Pure three-way merge for editor graphs; transport and revision handling stay with the host. */
export function mergeEditorTrees(
    baseline: EditorTree,
    local: EditorTree,
    remote: EditorTree,
): TreeMergeResult {
    const result = mergeValue(baseline, local, remote, []);
    if (result.kind === 'conflicts') return { kind: 'conflict', conflicts: result.conflicts };
    return { kind: 'merged', value: result.value as EditorTree };
}

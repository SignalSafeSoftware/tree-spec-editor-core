import { safeUUID } from '@signalsafe/tree-spec';

function randomHex(length: number): string {
    return safeUUID().replace(/-/g, '').slice(0, length);
}

/** Fresh editor node id (`n_` + 8 hex chars). */
export function newEditorNodeId(): string {
    return `n_${randomHex(8)}`;
}

/** Fresh editor choice id (`c_` + 6 hex chars). */
export function newEditorChoiceId(): string {
    return `c_${randomHex(6)}`;
}

import type { TreeSpecIssue } from '@signalsafe/tree-spec';

export { safeUUID } from '@signalsafe/tree-spec';
export {
    deleteTransitionsForChoice,
    getTransition,
    upsertTransition,
} from './transitionHelpers.js';
export type { MoveNodeChoiceDirection } from './choiceMoveHelpers.js';
export {
    moveChoiceInTree,
    moveNodeChoice,
    renameNodeChoiceId,
} from './choiceMoveHelpers.js';
export { lintEditorTree } from './editorLint.js';
export { newEditorChoiceId, newEditorNodeId } from './idHelpers.js';

/** Common node `type` presets for authoring UIs. */
export const TREE_SPEC_NODE_TYPE_PRESETS = [
    'prompt',
    'email',
    'sms',
    'call',
    'web',
    'attachment',
    'outcome',
] as const;

export type TreeSpecNodeTypePreset = (typeof TREE_SPEC_NODE_TYPE_PRESETS)[number];

function parseOutcomeErrorMessage(lowerMessage: string): string {
    if (lowerMessage.includes('transition to end must include outcome')) {
        return 'Transition to END must include outcome (safe / at_risk / compromised).';
    }
    if (lowerMessage.includes('non-end transition must not include outcome')) {
        return 'Non-END transition must not include outcome.';
    }
    return 'Validation error';
}

/**
 * Parse backend Pydantic validation messages into actionable issues with node_id/choice_id.
 */
export function parsePydanticOutcomeErrors(msg: string): TreeSpecIssue[] | null {
    const issues: TreeSpecIssue[] = [];
    const re = /input_value=\{'from': \['([^']+)', '([^']+)'\],[^}]*\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(msg)) !== null) {
        const node_id = m[1];
        const choice_id = m[2];
        const message = parseOutcomeErrorMessage(msg.toLowerCase());
        issues.push({ severity: 'error', message, node_id, choice_id });
    }
    return issues.length ? issues : null;
}

/** Validate drafts on load; skip when the version is published. */
export function shouldQueueInitialValidation(isPublished: boolean | undefined): boolean {
    return isPublished !== true;
}

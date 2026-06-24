import {
    isRecord,
    readGraphEditorMeta,
    type GraphEditorEdgeType,
} from '@signalsafe/tree-spec';

import type { EditorChoice } from '../model.js';
import { RENDER_HINTS_EDITOR_NS } from './nodeHints.js';

/** Per-choice canvas edge appearance stored under `choices[].render_hints.editor`. */
export type ChoiceEdgeHints = {
    showLabel?: boolean;
    strokeColor?: string;
    edgeType?: GraphEditorEdgeType | 'default';
};

export const DEFAULT_EDGE_TYPE: GraphEditorEdgeType = 'smoothstep';

/** Matches React Flow default edge stroke (`reactflow/dist/style.css`). */
export const DEFAULT_CANVAS_EDGE_STROKE = '#b1b1b7';

export const EDITOR_EDGE_TYPE_OPTIONS: ReadonlyArray<{
    value: ChoiceEdgeHints['edgeType'];
    label: string;
}> = [
    { value: 'default', label: 'Default (scenario)' },
    { value: 'straight', label: 'Straight' },
    { value: 'smoothstep', label: 'Smooth step' },
    { value: 'step', label: 'Step' },
];

function readChoiceEditorBucket(choice: EditorChoice): Record<string, unknown> {
    const hints = choice.render_hints;
    if (!isRecord(hints)) return {};
    const bucket = hints[RENDER_HINTS_EDITOR_NS];
    return isRecord(bucket) ? bucket : {};
}

/** Read canvas-only edge hints for a choice. */
export function getChoiceEdgeHints(choice: EditorChoice): ChoiceEdgeHints {
    const editor = readChoiceEditorBucket(choice);
    const edgeType = editor.edgeType;
    const parsedEdgeType =
        edgeType === 'default' ||
        edgeType === 'straight' ||
        edgeType === 'smoothstep' ||
        edgeType === 'step'
            ? edgeType
            : undefined;

    return {
        ...(typeof editor.showLabel === 'boolean' ? { showLabel: editor.showLabel } : {}),
        ...(typeof editor.strokeColor === 'string' ? { strokeColor: editor.strokeColor } : {}),
        ...(parsedEdgeType ? { edgeType: parsedEdgeType } : {}),
    };
}

/** Merge canvas-only edge hints onto a choice without clobbering unrelated keys. */
export function patchChoiceEdgeHints(
    choice: EditorChoice,
    patch: Partial<ChoiceEdgeHints>,
): EditorChoice {
    const hints = isRecord(choice.render_hints) ? { ...choice.render_hints } : {};
    const current = readChoiceEditorBucket(choice);
    const nextBucket: Record<string, unknown> = { ...current, ...patch };

    for (const [key, value] of Object.entries(nextBucket)) {
        if (value === undefined || value === null) {
            delete nextBucket[key];
        }
    }

    if (Object.keys(nextBucket).length > 0) {
        hints[RENDER_HINTS_EDITOR_NS] = nextBucket;
    } else if (isRecord(hints[RENDER_HINTS_EDITOR_NS])) {
        delete hints[RENDER_HINTS_EDITOR_NS];
    }

    if (Object.keys(hints).length > 0) {
        return { ...choice, render_hints: hints };
    }

    const { render_hints: _removed, ...rest } = choice;
    return rest;
}

/** Scenario-level default edge routing type. */
export function resolveDefaultEdgeType(meta: Record<string, unknown> | undefined): GraphEditorEdgeType {
    return readGraphEditorMeta(meta).default_edge_type ?? DEFAULT_EDGE_TYPE;
}

/** Effective edge type for a choice after applying scenario default. */
export function resolveEffectiveEdgeType(
    choice: EditorChoice,
    meta: Record<string, unknown> | undefined,
): GraphEditorEdgeType {
    const hints = getChoiceEdgeHints(choice);
    if (hints.edgeType && hints.edgeType !== 'default') {
        return hints.edgeType;
    }
    return resolveDefaultEdgeType(meta);
}

/** Canvas label visibility defaults to on unless explicitly hidden. */
export function shouldShowEdgeLabel(choice: EditorChoice): boolean {
    const hints = getChoiceEdgeHints(choice);
    return hints.showLabel !== false;
}

/** Author stroke color when set on the choice. */
export function resolveEdgeStrokeColor(choice: EditorChoice): string | undefined {
    return getChoiceEdgeHints(choice).strokeColor;
}

/** Stroke color shown on canvas and in the appearance color picker. */
export function resolveEdgeStrokeColorForDisplay(choice: EditorChoice): string {
    return resolveEdgeStrokeColor(choice) ?? DEFAULT_CANVAS_EDGE_STROKE;
}

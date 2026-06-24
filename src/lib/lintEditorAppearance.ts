import {
    GRAPH_EDITOR_META_NS,
    isRecord,
    readGraphEditorMeta,
    type TreeSpecIssue,
} from '@signalsafe/tree-spec';

import { getChoiceEdgeHints } from './choiceEdgeHints.js';
import { RENDER_HINTS_EDITOR_NS } from './nodeHints.js';
import type { EditorNode, EditorTree } from '../model.js';

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function formatUnknownValue(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
        return `${value}`;
    }
    if (value == null) {
        return '';
    }
    try {
        return JSON.stringify(value) ?? '';
    } catch {
        return '[unserializable]';
    }
}

function isValidHexColor(value: string): boolean {
    return HEX_COLOR_RE.test(value);
}

function pushNodeWarning(
    issues: TreeSpecIssue[],
    nodeId: string,
    message: string,
): void {
    issues.push({ severity: 'warning', message, node_id: nodeId });
}

function lintPositiveNumberField(
    issues: TreeSpecIssue[],
    nodeId: string,
    _field: string,
    label: string,
    value: unknown,
): void {
    if (value === undefined || value === null) return;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        pushNodeWarning(
            issues,
            nodeId,
            `Node ${label} must be a positive number (got ${formatUnknownValue(value)}).`,
        );
    }
}

function lintColorField(
    issues: TreeSpecIssue[],
    nodeId: string,
    field: string,
    label: string,
    value: unknown,
    choiceId?: string,
): void {
    if (value === undefined || value === null) return;
    if (typeof value !== 'string' || !isValidHexColor(value)) {
        issues.push({
            severity: 'warning',
            message: choiceId
                ? `Choice edge color must be a hex color like #rgb or #rrggbb (invalid ${field}).`
                : `Node ${label} must be a hex color like #rgb or #rrggbb (invalid ${field}).`,
            node_id: nodeId,
            ...(choiceId ? { choice_id: choiceId } : {}),
        });
    }
}

function lintEditorBucket(issues: TreeSpecIssue[], node: EditorNode, editor: Record<string, unknown>): void {
    lintPositiveNumberField(issues, node.id, 'width', 'width', editor.width);
    lintPositiveNumberField(issues, node.id, 'height', 'height', editor.height);
    lintPositiveNumberField(issues, node.id, 'fontSize', 'font size', editor.fontSize);

    lintColorField(issues, node.id, 'backgroundColor', 'background color', editor.backgroundColor);
    lintColorField(issues, node.id, 'foregroundColor', 'text color', editor.foregroundColor);

    const textAlign = editor.textAlign;
    if (
        textAlign !== undefined &&
        textAlign !== null &&
        textAlign !== 'left' &&
        textAlign !== 'center' &&
        textAlign !== 'right'
    ) {
        pushNodeWarning(
            issues,
            node.id,
            `Node text align must be left, center, or right (got ${formatUnknownValue(textAlign)}).`,
        );
    }

    const textWrap = editor.textWrap;
    if (textWrap !== undefined && textWrap !== null && textWrap !== 'wrap' && textWrap !== 'truncate') {
        pushNodeWarning(
            issues,
            node.id,
            `Node text wrap must be "wrap" or "truncate" (got ${formatUnknownValue(textWrap)}).`,
        );
    }

    const graphPosition = editor.graph_position;
    if (graphPosition !== undefined && graphPosition !== null) {
        if (isRecord(graphPosition)) {
            const { x, y } = graphPosition;
            if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
                pushNodeWarning(
                    issues,
                    node.id,
                    'Node graph position must include finite numeric x and y coordinates.',
                );
            }
        } else {
            pushNodeWarning(issues, node.id, 'Node graph position must be an object with numeric x and y.');
        }
    }
}

function lintNodeAppearance(issues: TreeSpecIssue[], node: EditorNode): void {
    const hints = node.render_hints;
    if (!isRecord(hints)) return;
    const editor = hints[RENDER_HINTS_EDITOR_NS];
    if (isRecord(editor)) {
        lintEditorBucket(issues, node, editor);
    }

    for (const choice of node.choices ?? []) {
        const choiceHints = getChoiceEdgeHints(choice);
        lintColorField(
            issues,
            node.id,
            'strokeColor',
            'Choice edge color',
            choiceHints.strokeColor,
            choice.id,
        );
        const edgeType = choiceHints.edgeType;
        if (
            edgeType !== undefined &&
            edgeType !== 'default' &&
            edgeType !== 'straight' &&
            edgeType !== 'smoothstep' &&
            edgeType !== 'step'
        ) {
            issues.push({
                severity: 'warning',
                message: `Choice edge type must be default, straight, smoothstep, or step (got ${String(edgeType)}).`,
                node_id: node.id,
                choice_id: choice.id,
            });
        }
    }
}

function lintGraphEditorMeta(issues: TreeSpecIssue[], tree: EditorTree): void {
    const meta = tree._meta;
    if (!isRecord(meta)) return;
    const bucket = meta[GRAPH_EDITOR_META_NS];
    if (!isRecord(bucket)) return;

    const parsed = readGraphEditorMeta(meta);

    if (bucket.end_position !== undefined && parsed.end_position === undefined) {
        issues.push({
            severity: 'warning',
            message: 'Graph editor END position must include finite numeric x and y coordinates.',
        });
    }

    if (bucket.viewport !== undefined && parsed.viewport === undefined) {
        issues.push({
            severity: 'warning',
            message: 'Graph editor viewport must include finite x, y, and a positive zoom value.',
        });
    }

    if (
        bucket.default_edge_type !== undefined &&
        parsed.default_edge_type === undefined
    ) {
        issues.push({
            severity: 'warning',
            message: 'Graph editor default edge type must be straight, smoothstep, or step.',
        });
    }
}

/** Warn on invalid canvas appearance hints under `render_hints.editor` and `_meta.graph_editor`. */
export function lintEditorAppearance(tree: EditorTree): TreeSpecIssue[] {
    const issues: TreeSpecIssue[] = [];
    for (const node of Object.values(tree.nodes)) {
        lintNodeAppearance(issues, node);
    }
    lintGraphEditorMeta(issues, tree);
    return issues;
}

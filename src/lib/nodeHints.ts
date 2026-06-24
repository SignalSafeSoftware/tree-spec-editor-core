import { isRecord } from '@signalsafe/tree-spec';

import type { EditorNode } from '../model.js';

/** Legacy presentation namespace — not applied to preview/runtime by default. */
export const RENDER_HINTS_THEME_NS = 'theme';

/** Graph-editor-only namespace (layout, lock, canvas appearance). */
export const RENDER_HINTS_EDITOR_NS = 'editor';

export const GRAPH_POSITION_KEY = 'graph_position';

/** Default canvas node width when {@link NodeEditorHints.width} is unset (auto). */
export const DEFAULT_GRAPH_NODE_WIDTH = 280;

/** How long node text is displayed within the fixed canvas width. */
export type NodeTextWrap = 'wrap' | 'truncate';

export const DEFAULT_NODE_TEXT_WRAP: NodeTextWrap = 'wrap';

export type GraphPosition = { x: number; y: number };

export type NodeEditorHints = {
    locked?: boolean;
    width?: number;
    height?: number;
    graph_position?: GraphPosition;
    backgroundColor?: string;
    foregroundColor?: string;
    fontSize?: number;
    fontWeight?: number | string;
    fontFamily?: string;
    textAlign?: 'left' | 'center' | 'right';
    /** Canvas-only: wrap long text or truncate with ellipsis. */
    textWrap?: NodeTextWrap;
};

type NodeAppearanceHints = Pick<
    NodeEditorHints,
    | 'backgroundColor'
    | 'foregroundColor'
    | 'fontSize'
    | 'fontWeight'
    | 'fontFamily'
    | 'textAlign'
>;

function parsePositiveNumber(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        return undefined;
    }
    return value;
}

function parseGraphPosition(value: unknown): GraphPosition | undefined {
    if (!isRecord(value)) return undefined;
    const x = value.x;
    const y = value.y;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
        return undefined;
    }
    return { x, y };
}

function parseTextAlign(value: unknown): NodeEditorHints['textAlign'] | undefined {
    if (value === 'left' || value === 'center' || value === 'right') return value;
    return undefined;
}

function parseTextWrap(value: unknown): NodeTextWrap | undefined {
    if (value === 'wrap' || value === 'truncate') return value;
    return undefined;
}

function readNamespace(
    node: EditorNode,
    namespace: string,
): Record<string, unknown> {
    const hints = node.render_hints;
    if (!isRecord(hints)) return {};
    const bucket = hints[namespace];
    return isRecord(bucket) ? bucket : {};
}

function mergeNamespace(
    node: EditorNode,
    namespace: string,
    patch: Record<string, unknown>,
): Record<string, unknown> {
    const hints = isRecord(node.render_hints) ? { ...node.render_hints } : {};
    const current = readNamespace(node, namespace);
    const nextBucket = { ...current, ...patch };

    for (const [key, value] of Object.entries(nextBucket)) {
        if (value === undefined || value === null) {
            delete nextBucket[key];
        }
    }

    if (Object.keys(nextBucket).length > 0) {
        hints[namespace] = nextBucket;
    } else {
        delete hints[namespace];
    }

    return hints;
}

function parseAppearanceBucket(bucket: Record<string, unknown>): NodeAppearanceHints {
    const fontSize = parsePositiveNumber(bucket.fontSize);
    const textAlign = parseTextAlign(bucket.textAlign);
    return {
        ...(typeof bucket.backgroundColor === 'string' ? { backgroundColor: bucket.backgroundColor } : {}),
        ...(typeof bucket.foregroundColor === 'string' ? { foregroundColor: bucket.foregroundColor } : {}),
        ...(fontSize === undefined ? {} : { fontSize }),
        ...(bucket.fontWeight !== undefined &&
        (typeof bucket.fontWeight === 'string' || typeof bucket.fontWeight === 'number')
            ? { fontWeight: bucket.fontWeight }
            : {}),
        ...(typeof bucket.fontFamily === 'string' ? { fontFamily: bucket.fontFamily } : {}),
        ...(textAlign === undefined ? {} : { textAlign }),
    };
}

function mergeAppearance(
    primary: NodeAppearanceHints,
    fallback: NodeAppearanceHints,
): NodeAppearanceHints {
    return {
        ...(fallback.backgroundColor && !primary.backgroundColor
            ? { backgroundColor: fallback.backgroundColor }
            : {}),
        ...(fallback.foregroundColor && !primary.foregroundColor
            ? { foregroundColor: fallback.foregroundColor }
            : {}),
        ...(fallback.fontSize !== undefined && primary.fontSize === undefined
            ? { fontSize: fallback.fontSize }
            : {}),
        ...(fallback.fontWeight !== undefined && primary.fontWeight === undefined
            ? { fontWeight: fallback.fontWeight }
            : {}),
        ...(fallback.fontFamily && !primary.fontFamily ? { fontFamily: fallback.fontFamily } : {}),
        ...(fallback.textAlign && !primary.textAlign ? { textAlign: fallback.textAlign } : {}),
        ...primary,
    };
}

/** Read legacy presentation hints from `render_hints.theme`. */
export function getThemeHints(node: EditorNode): NodeAppearanceHints {
    return parseAppearanceBucket(readNamespace(node, RENDER_HINTS_THEME_NS));
}

export function getEditorHints(node: EditorNode): NodeEditorHints {
    const editor = readNamespace(node, RENDER_HINTS_EDITOR_NS);
    const graphPosition = parseGraphPosition(editor[GRAPH_POSITION_KEY]) ?? node.position;
    const editorAppearance = parseAppearanceBucket(editor);
    const legacyThemeAppearance = parseAppearanceBucket(readNamespace(node, RENDER_HINTS_THEME_NS));
    const appearance = mergeAppearance(editorAppearance, legacyThemeAppearance);
    const width = parsePositiveNumber(editor.width);
    const height = parsePositiveNumber(editor.height);
    const textWrap = parseTextWrap(editor.textWrap);

    return {
        ...appearance,
        ...(editor.locked === true ? { locked: true } : {}),
        ...(width === undefined ? {} : { width }),
        ...(height === undefined ? {} : { height }),
        ...(textWrap === undefined ? {} : { textWrap }),
        ...(graphPosition ? { graph_position: graphPosition } : {}),
    };
}

export function isNodeLocked(node: EditorNode): boolean {
    return getEditorHints(node).locked === true;
}

/** Resolved canvas width in px (explicit hint or {@link DEFAULT_GRAPH_NODE_WIDTH}). */
export function resolveCanvasNodeWidth(editor: NodeEditorHints): number {
    return editor.width ?? DEFAULT_GRAPH_NODE_WIDTH;
}

/** Resolved text wrap mode (explicit hint or {@link DEFAULT_NODE_TEXT_WRAP}). */
export function resolveNodeTextWrap(editor: NodeEditorHints): NodeTextWrap {
    return editor.textWrap ?? DEFAULT_NODE_TEXT_WRAP;
}

/** CSS classes for prompt/choice text inside a fixed-width canvas node. */
export function nodeTextWrapClassName(wrap: NodeTextWrap, context: 'block' | 'flex' = 'block'): string {
    if (wrap === 'wrap') {
        return 'graph-editor-node-text-wrap min-w-0';
    }
    return context === 'flex' ? 'graph-editor-node-flex-truncate' : 'graph-editor-node-text-truncate';
}

export function patchEditorHints(node: EditorNode, patch: Partial<NodeEditorHints>): EditorNode {
    const { graph_position, ...rest } = patch;
    const editorPatch: Record<string, unknown> = { ...rest };
    if (graph_position !== undefined) {
        editorPatch[GRAPH_POSITION_KEY] = graph_position;
    }
    const render_hints = mergeNamespace(node, RENDER_HINTS_EDITOR_NS, editorPatch);
    const next: EditorNode = { ...node, render_hints };
    if (graph_position !== undefined) {
        next.position = graph_position;
    }
    return next;
}

/** Build inline CSS for canvas node appearance (editor-only; not used in preview). */
export function editorHintsToStyle(hints: NodeAppearanceHints): Record<string, string | number> {
    const style: Record<string, string | number> = {};
    if (hints.backgroundColor) style.backgroundColor = hints.backgroundColor;
    if (hints.foregroundColor) style.color = hints.foregroundColor;
    if (hints.fontSize !== undefined) style.fontSize = hints.fontSize;
    if (hints.fontWeight !== undefined) style.fontWeight = hints.fontWeight;
    if (hints.fontFamily) style.fontFamily = hints.fontFamily;
    if (hints.textAlign) style.textAlign = hints.textAlign;
    return style;
}

export const KEYBOARD_SHORTCUT_ACTION = {
    SAVE: 'save',
    VALIDATE: 'validate',
    PREVIEW: 'preview',
    DUPLICATE: 'duplicate',
    DELETE: 'delete',
    UNDO: 'undo',
    REDO: 'redo',
    COPY: 'copy',
    PASTE: 'paste',
} as const;

export type KeyboardShortcutAction =
    (typeof KEYBOARD_SHORTCUT_ACTION)[keyof typeof KEYBOARD_SHORTCUT_ACTION];

export interface KeyboardShortcutParams {
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    key: string;
    hasSelectedNode: boolean;
    hasSelectedEdge?: boolean;
    canUndo?: boolean;
    canRedo?: boolean;
    hasCopiedNode?: boolean;
}

function normalizedKey(key: string): string {
    return key.length === 1 ? key.toLowerCase() : key;
}

function tryUndoRedoShortcut(
    params: KeyboardShortcutParams,
    mod: boolean,
    shiftKey: boolean,
    key: string,
): KeyboardShortcutAction | null {
    if (!mod) return null;
    if (!shiftKey && key === 'z' && params.canUndo) return KEYBOARD_SHORTCUT_ACTION.UNDO;
    if (shiftKey && key === 'z' && params.canRedo) return KEYBOARD_SHORTCUT_ACTION.REDO;
    if (!shiftKey && key === 'y' && params.canRedo) return KEYBOARD_SHORTCUT_ACTION.REDO;
    return null;
}

function tryClipboardShortcut(
    mod: boolean,
    shiftKey: boolean,
    key: string,
    hasSelectedNode: boolean,
    hasCopiedNode?: boolean,
): KeyboardShortcutAction | null {
    if (!mod || shiftKey) return null;
    if (key === 'c' && hasSelectedNode) return KEYBOARD_SHORTCUT_ACTION.COPY;
    if (key === 'v' && hasCopiedNode) return KEYBOARD_SHORTCUT_ACTION.PASTE;
    return null;
}

function tryDocumentShortcut(
    mod: boolean,
    shiftKey: boolean,
    key: string,
    hasSelectedNode: boolean,
): KeyboardShortcutAction | null {
    if (!mod) return null;
    if (!shiftKey && key === 's') return KEYBOARD_SHORTCUT_ACTION.SAVE;
    if (shiftKey && key === 'v') return KEYBOARD_SHORTCUT_ACTION.VALIDATE;
    if (!shiftKey && key === 'p') return KEYBOARD_SHORTCUT_ACTION.PREVIEW;
    if (!shiftKey && key === 'd' && hasSelectedNode) return KEYBOARD_SHORTCUT_ACTION.DUPLICATE;
    return null;
}

function tryDeleteShortcut(key: string, canDelete: boolean): KeyboardShortcutAction | null {
    if (!canDelete) return null;
    if (key === 'delete' || key === 'backspace' || key === 'Delete' || key === 'Backspace') {
        return KEYBOARD_SHORTCUT_ACTION.DELETE;
    }
    return null;
}

/** Map a key event to a shortcut action, or `null` when unhandled. */
export function getKeyboardShortcutAction(params: KeyboardShortcutParams): KeyboardShortcutAction | null {
    const { ctrlKey, metaKey, shiftKey, hasSelectedNode } = params;
    const mod = ctrlKey || metaKey;
    const key = normalizedKey(params.key);
    const canDelete = hasSelectedNode || Boolean(params.hasSelectedEdge);

    return (
        tryUndoRedoShortcut(params, mod, shiftKey, key)
        ?? tryClipboardShortcut(mod, shiftKey, key, hasSelectedNode, params.hasCopiedNode)
        ?? tryDocumentShortcut(mod, shiftKey, key, hasSelectedNode)
        ?? tryDeleteShortcut(key, canDelete)
    );
}

import { describe, expect, it } from 'vitest';
import {
    KEYBOARD_SHORTCUT_ACTION,
    getKeyboardShortcutAction,
    type KeyboardShortcutParams,
} from '../../src/lib/keyboardShortcuts';

describe('KEYBOARD_SHORTCUT_ACTION', () => {
    it('exposes the canonical action values', () => {
        expect(KEYBOARD_SHORTCUT_ACTION).toEqual({
            SAVE: 'save',
            VALIDATE: 'validate',
            PREVIEW: 'preview',
            DUPLICATE: 'duplicate',
            DELETE: 'delete',
            UNDO: 'undo',
            REDO: 'redo',
            COPY: 'copy',
            PASTE: 'paste',
        });
    });
});

function params(overrides: Partial<KeyboardShortcutParams> = {}): KeyboardShortcutParams {
    return {
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        key: '',
        hasSelectedNode: false,
        ...overrides,
    };
}

describe('getKeyboardShortcutAction', () => {
    it('maps Ctrl+S and Cmd+S to save regardless of selection', () => {
        expect(getKeyboardShortcutAction(params({ ctrlKey: true, key: 's' }))).toBe('save');
        expect(getKeyboardShortcutAction(params({ metaKey: true, key: 's' }))).toBe('save');
        expect(getKeyboardShortcutAction(params({ ctrlKey: true, key: 'S' }))).toBe('save');
    });

    it('maps Ctrl+Shift+V (and Cmd+Shift+V) to validate', () => {
        expect(
            getKeyboardShortcutAction(params({ ctrlKey: true, shiftKey: true, key: 'v' })),
        ).toBe('validate');
        expect(
            getKeyboardShortcutAction(params({ metaKey: true, shiftKey: true, key: 'V' })),
        ).toBe('validate');
    });

    it('maps Ctrl+P (and Cmd+P) to preview', () => {
        expect(getKeyboardShortcutAction(params({ ctrlKey: true, key: 'p' }))).toBe('preview');
        expect(getKeyboardShortcutAction(params({ metaKey: true, key: 'P' }))).toBe('preview');
    });

    it('only maps Ctrl+D to duplicate when a node is selected', () => {
        expect(
            getKeyboardShortcutAction(params({ ctrlKey: true, key: 'd', hasSelectedNode: true })),
        ).toBe('duplicate');
        expect(
            getKeyboardShortcutAction(params({ ctrlKey: true, key: 'd', hasSelectedNode: false })),
        ).toBeNull();
    });

    it('only maps Delete and Backspace to delete when a node or edge is selected', () => {
        expect(
            getKeyboardShortcutAction(params({ key: 'Delete', hasSelectedNode: true })),
        ).toBe('delete');
        expect(
            getKeyboardShortcutAction(params({ key: 'Backspace', hasSelectedNode: true })),
        ).toBe('delete');
        expect(
            getKeyboardShortcutAction(params({ key: 'Delete', hasSelectedEdge: true })),
        ).toBe('delete');
        expect(
            getKeyboardShortcutAction(params({ key: 'Delete', hasSelectedNode: false })),
        ).toBeNull();
        expect(
            getKeyboardShortcutAction(params({ key: 'Backspace', hasSelectedNode: false })),
        ).toBeNull();
    });

    it('maps Ctrl+Z and Cmd+Z to undo when canUndo', () => {
        expect(
            getKeyboardShortcutAction(params({ ctrlKey: true, key: 'z', canUndo: true })),
        ).toBe('undo');
        expect(
            getKeyboardShortcutAction(params({ metaKey: true, key: 'Z', canUndo: true })),
        ).toBe('undo');
        expect(
            getKeyboardShortcutAction(params({ ctrlKey: true, key: 'z', canUndo: false })),
        ).toBeNull();
    });

    it('maps Ctrl+Shift+Z, Cmd+Shift+Z, and Ctrl+Y to redo when canRedo', () => {
        expect(
            getKeyboardShortcutAction(params({ ctrlKey: true, shiftKey: true, key: 'z', canRedo: true })),
        ).toBe('redo');
        expect(
            getKeyboardShortcutAction(params({ metaKey: true, shiftKey: true, key: 'Z', canRedo: true })),
        ).toBe('redo');
        expect(
            getKeyboardShortcutAction(params({ ctrlKey: true, key: 'y', canRedo: true })),
        ).toBe('redo');
    });

    it('maps Ctrl+C to copy when a node is selected', () => {
        expect(
            getKeyboardShortcutAction(params({ ctrlKey: true, key: 'c', hasSelectedNode: true })),
        ).toBe('copy');
        expect(
            getKeyboardShortcutAction(params({ ctrlKey: true, key: 'c', hasSelectedNode: false })),
        ).toBeNull();
    });

    it('maps Ctrl+V to paste when a node was copied', () => {
        expect(
            getKeyboardShortcutAction(params({ ctrlKey: true, key: 'v', hasCopiedNode: true })),
        ).toBe('paste');
        expect(
            getKeyboardShortcutAction(params({ ctrlKey: true, key: 'v', hasCopiedNode: false })),
        ).toBeNull();
    });

    it('returns null for unrelated keys or missing modifiers', () => {
        expect(getKeyboardShortcutAction(params({ key: 's' }))).toBeNull();
        expect(getKeyboardShortcutAction(params({ ctrlKey: true, key: 'v' }))).toBeNull();
        expect(getKeyboardShortcutAction(params({ key: 'Enter' }))).toBeNull();
    });
});

import { describe, expect, it } from 'vitest';
import { AUTOSAVE_STATUS, getAutosaveStatusLabel, type AutosaveStatus } from '../../src/lib/autosave';

describe('AUTOSAVE_STATUS', () => {
    it('exposes the four canonical state values', () => {
        expect(AUTOSAVE_STATUS).toEqual({
            IDLE: 'idle',
            DIRTY: 'dirty',
            SAVING: 'saving',
            SAVED: 'saved',
        });
    });
});

describe('getAutosaveStatusLabel', () => {
    it('returns an empty string for idle so the toolbar can render nothing', () => {
        expect(getAutosaveStatusLabel(AUTOSAVE_STATUS.IDLE)).toBe('');
    });

    it('maps each transient autosave state to its toolbar label', () => {
        expect(getAutosaveStatusLabel(AUTOSAVE_STATUS.DIRTY)).toBe('Unsaved changes…');
        expect(getAutosaveStatusLabel(AUTOSAVE_STATUS.SAVING)).toBe('Autosaving…');
        expect(getAutosaveStatusLabel(AUTOSAVE_STATUS.SAVED)).toBe('Saved ✓');
    });

    it('returns an empty string for unknown status values', () => {
        expect(getAutosaveStatusLabel('unknown' as AutosaveStatus)).toBe('');
    });
});

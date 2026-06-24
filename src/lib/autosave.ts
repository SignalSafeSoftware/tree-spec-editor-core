export const AUTOSAVE_STATUS = {
    IDLE: 'idle',
    DIRTY: 'dirty',
    SAVING: 'saving',
    SAVED: 'saved',
} as const;

export type AutosaveStatus = (typeof AUTOSAVE_STATUS)[keyof typeof AUTOSAVE_STATUS];

const LABELS: Record<AutosaveStatus, string> = {
    idle: '',
    dirty: 'Unsaved changes…',
    saving: 'Autosaving…',
    saved: 'Saved ✓',
};

/** Default toolbar label for an autosave status (empty for `idle`). */
export function getAutosaveStatusLabel(status: AutosaveStatus): string {
    return LABELS[status] ?? '';
}

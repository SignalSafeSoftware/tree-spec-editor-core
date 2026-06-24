import { describe, expect, it } from 'vitest';
import { buildStableEntries } from '../../src/lib/panelHelpers';

describe('buildStableEntries', () => {
    it('uses base keys for first occurrence and suffixes duplicates', () => {
        const entries = buildStableEntries(
            ['alpha', 'beta', 'alpha', 'alpha'],
            (item) => item,
        );
        expect(entries.map((entry) => entry.key)).toEqual([
            'alpha',
            'beta',
            'alpha-1',
            'alpha-2',
        ]);
        expect(entries.map((entry) => entry.item)).toEqual([
            'alpha',
            'beta',
            'alpha',
            'alpha',
        ]);
    });

    it('includes index in keyFor when provided', () => {
        const entries = buildStableEntries(['a', 'b'], (_item, index) => `row-${index}`);
        expect(entries.map((entry) => entry.key)).toEqual(['row-0', 'row-1']);
    });
});

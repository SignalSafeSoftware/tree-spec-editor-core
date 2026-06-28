import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('package boundary', () => {
    it('does not depend on React, DOM, or Bootstrap packages', () => {
        const pkg = JSON.parse(
            readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
        ) as {
            dependencies?: Record<string, string>;
            peerDependencies?: Record<string, string>;
            devDependencies?: Record<string, string>;
        };

        const names = [
            ...Object.keys(pkg.dependencies ?? {}),
            ...Object.keys(pkg.peerDependencies ?? {}),
            ...Object.keys(pkg.devDependencies ?? {}),
        ];

        for (const name of names) {
            expect(name).not.toMatch(/react/i);
            expect(name).not.toMatch(/bootstrap/i);
        }
    });
});

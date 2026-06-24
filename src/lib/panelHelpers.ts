export interface StableEntry<T> {
    item: T;
    key: string;
}

/** Build React list entries with collision-safe keys. */
export function buildStableEntries<T>(
    items: readonly T[],
    keyFor: (item: T, index: number) => string,
): StableEntry<T>[] {
    const seen = new Map<string, number>();
    return items.map((item, index) => {
        const base = keyFor(item, index);
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        const key = count === 0 ? base : `${base}-${count}`;
        return { item, key };
    });
}

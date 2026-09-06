// Shared empty singletons for hooks that fall back to "nothing yet".
//
// `data ?? []` allocates a fresh array on every render, so a consumer holding it
// sees a new identity each tick even when the data has not changed, which defeats
// React.memo and re-renders it for no reason. Returning these frozen singletons
// instead keeps the identity stable across renders until real data arrives.
//
// Typed helpers rather than one shared `[]`: the generic keeps call sites typed
// without an `as` cast, and `Object.freeze` makes an accidental mutation throw in
// dev instead of corrupting the shared value.

const FROZEN_ARRAY: readonly never[] = Object.freeze([]);
const FROZEN_OBJECT: Readonly<Record<string, never>> = Object.freeze({});
const FROZEN_SET: ReadonlySet<never> = Object.freeze(new Set<never>()) as ReadonlySet<never>;

/** Stable empty array. Same reference on every call. */
export function emptyArray<T>(): readonly T[] {
  return FROZEN_ARRAY as readonly T[];
}

/** Stable empty record. Same reference on every call. */
export function emptyObject<V>(): Readonly<Record<string, V>> {
  return FROZEN_OBJECT as Readonly<Record<string, V>>;
}

/** Stable empty set. Same reference on every call. */
export function emptySet<T>(): ReadonlySet<T> {
  return FROZEN_SET as ReadonlySet<T>;
}

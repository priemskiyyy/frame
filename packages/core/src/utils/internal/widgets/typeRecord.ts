// Overload: enumerating the registry erases its key type.
export function typeRecord<TKey extends string, TValue>(
  entries: [string, TValue][],
): Record<TKey, TValue>;

export function typeRecord<TValue>(
  entries: [string, TValue][],
): Record<string, TValue> {
  return Object.fromEntries(entries);
}

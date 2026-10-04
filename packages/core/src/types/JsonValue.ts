import type { JsonRecord } from "src/types/JsonRecord";

/**
 * A value that survives JSON unchanged: a string, a finite number, a boolean,
 * `null`, or an array or record of the same.
 *
 * @example
 * ```ts
 * const value: JsonValue = { days: 12, tags: ["streak"], note: null };
 * ```
 */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | JsonRecord;

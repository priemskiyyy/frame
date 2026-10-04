import type { JsonValue } from "src/types/JsonValue";

/**
 * A plain record of JSON values. An `undefined` field is an absent field, as
 * it is in JSON: Frame drops it instead of rejecting it, so an optional
 * field from a schema's output type is welcome.
 *
 * @example
 * ```ts
 * const record: JsonRecord = { state: "ready", days: 12, label: undefined };
 * ```
 */
export type JsonRecord = { [key: string]: JsonValue | undefined };

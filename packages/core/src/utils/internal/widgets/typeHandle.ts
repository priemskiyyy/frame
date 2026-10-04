import type { JsonRecord } from "src/types/JsonRecord";
import type { WidgetHandle } from "src/types/WidgetHandle";

// Overload: enumerating the registry erases which handle belongs to which key.
export function typeHandle<TData extends JsonRecord>(
  handle: WidgetHandle<JsonRecord>,
): WidgetHandle<TData>;

export function typeHandle(
  handle: WidgetHandle<JsonRecord>,
): WidgetHandle<JsonRecord> {
  return handle;
}

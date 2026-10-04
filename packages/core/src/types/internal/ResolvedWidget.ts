import type { JsonRecord } from "src/types/JsonRecord";
import type { WidgetAdapter } from "src/types/WidgetAdapter";
import type { WidgetDefinition } from "src/types/WidgetDefinition";

/** One widget of a Frame as its constructor settled it: the fallback read once, and the adapters that may host it, in order. */
export type ResolvedWidget = {
  key: string;
  definition: WidgetDefinition;
  fallback: { snapshot: JsonRecord; canonical: string };
  adapters: WidgetAdapter[];
};

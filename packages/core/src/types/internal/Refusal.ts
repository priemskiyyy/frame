import type { WidgetAdapter } from "src/types/WidgetAdapter";

/** Why one adapter said it cannot host a widget here. */
export type Refusal = {
  adapter: WidgetAdapter;
  reason: string;
  remediation: string | null;
};

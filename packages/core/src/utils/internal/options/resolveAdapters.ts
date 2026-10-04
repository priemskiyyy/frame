import type { ResolvedWidget } from "src/types/internal/ResolvedWidget";
import type { WidgetAdapter } from "src/types/WidgetAdapter";
import { FrameError } from "src/utils/FrameError";

/**
 * Hands each adapter to the widget whose definition it names, keeping the
 * order the application listed them in, and refuses an adapter for a widget
 * this Frame does not list.
 */
export const resolveAdapters = (
  widgets: Omit<ResolvedWidget, "adapters">[],
  adapters: WidgetAdapter[],
): ResolvedWidget[] => {
  const names = new Set(widgets.map(({ definition }) => definition.name));

  for (const adapter of adapters) {
    if (names.has(adapter.definition.name)) {
      continue;
    }

    throw new FrameError({
      code: "INVALID_CONFIGURATION",
      message: `The ${adapter.name} adapter is for ${adapter.definition.name}, which this Frame does not list in widgets.`,
    });
  }

  return widgets.map((widget) => ({
    ...widget,
    adapters: adapters.filter(
      ({ definition }) => definition.name === widget.definition.name,
    ),
  }));
};

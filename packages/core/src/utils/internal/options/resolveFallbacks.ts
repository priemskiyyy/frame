import type { ResolvedWidget } from "src/types/internal/ResolvedWidget";
import type { FrameLimits } from "src/types/FrameLimits";
import type { Widgets } from "src/types/Widgets";
import { WIDGET_NAME_PATTERN } from "src/utils/constants/widgetName";
import { captureSnapshot } from "src/utils/internal/transport/captureSnapshot";
import { createSnapshot } from "src/utils/internal/transport/createSnapshot";
import { validateSnapshot } from "src/utils/internal/validation/validateSnapshot";
import { FrameError } from "src/utils/FrameError";

/**
 * Reads every widget's fallback into its canonical text once, under the
 * Frame's limits, and refuses a registry that names one native widget twice.
 */
export const resolveFallbacks = (
  widgets: Widgets,
  limits: FrameLimits,
): Omit<ResolvedWidget, "adapters">[] => {
  const names = new Set<string>();

  return Object.entries(widgets).map(([key, definition]) => {
    if (names.has(definition.name)) {
      throw new FrameError({
        code: "INVALID_CONFIGURATION",
        message: `Two widgets are named ${definition.name}: one native widget cannot have two owners.`,
      });
    }

    names.add(definition.name);

    // A definition `widget()` did not make has not been checked yet.
    if (!WIDGET_NAME_PATTERN.test(definition.name)) {
      throw new FrameError({
        code: "INVALID_CONFIGURATION",
        message: `A widget name is letters and digits and starts with a letter, and "${definition.name}" is not.`,
      });
    }

    const captured = captureSnapshot(definition.fallback, limits);

    if (captured.status === "rejected") {
      throw new FrameError({
        code: "INVALID_CONFIGURATION",
        message: `The fallback of "${key}" breaks the limits of this Frame: ${captured.issues[0]?.message}`,
      });
    }

    const validation = validateSnapshot(definition, captured.canonical, limits);

    if ("then" in validation || validation.status === "rejected") {
      throw new FrameError({
        code: "INVALID_CONFIGURATION",
        message: `The fallback of "${key}" is not valid under its schema, answered at once.`,
      });
    }

    return {
      key,
      definition,
      fallback: {
        snapshot: createSnapshot(captured.canonical),
        canonical: captured.canonical,
      },
    };
  });
};

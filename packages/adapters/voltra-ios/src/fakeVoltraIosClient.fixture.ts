import type { ReactNode } from "react";

import type { VoltraScheduledEntry } from "src/types/VoltraScheduledEntry";
import type { VoltraWidgetVariants } from "src/types/VoltraWidgetVariants";

// A component Voltra can render; a host element such as a span is not one.
export const Label = (props: { children?: ReactNode }) => props.children;

const assertRenderable = (variants: VoltraWidgetVariants) => {
  for (const node of Object.values(variants)) {
    if (typeof node !== "object" || node === null || !("type" in node)) {
      continue;
    }

    if (typeof node.type !== "string") {
      continue;
    }

    throw new Error(
      `Host component "${node.type}" is not supported in Voltra.`,
    );
  }
};

// A fake of @use-voltra/ios-client 2.3.2: off Apple every function resolves without doing anything, and every function is async, so a failure rejects.
export const createFakeVoltraIosClient = ({
  onApple = true,
}: { onApple?: boolean } = {}) => {
  const calls: string[] = [];
  const reloads: (string[] | null)[] = [];
  const snapshots = new Map<string, VoltraWidgetVariants>();
  const timelines = new Map<string, VoltraScheduledEntry[]>();
  let failure: Error | null = null;

  const run = (call: string, effect: () => void) => {
    calls.push(call);

    if (!onApple) {
      return;
    }

    const pending = failure;

    failure = null;

    if (pending !== null) {
      throw pending;
    }

    effect();
  };

  const sdk = {
    assertRunningOnApple: () => {
      calls.push("assertRunningOnApple");

      return onApple;
    },
    updateWidget: async (widgetId: string, variants: VoltraWidgetVariants) => {
      run(`updateWidget:${widgetId}`, () => {
        assertRenderable(variants);
        snapshots.set(widgetId, variants);
        timelines.delete(widgetId);
        reloads.push([widgetId]);
      });
    },
    scheduleWidget: async (
      widgetId: string,
      entries: VoltraScheduledEntry[],
    ) => {
      run(`scheduleWidget:${widgetId}`, () => {
        for (const entry of entries) {
          assertRenderable(entry.variants);
        }

        timelines.set(widgetId, entries);
        reloads.push([widgetId]);
      });
    },
    reloadWidgets: async (widgetIds?: string[]) => {
      run(`reloadWidgets:${(widgetIds ?? []).join(",")}`, () => {
        reloads.push(widgetIds ?? null);
      });
    },
  };

  return {
    sdk,
    calls,
    reloads,
    snapshot: (widgetId: string) => snapshots.get(widgetId) ?? null,
    timeline: (widgetId: string) => timelines.get(widgetId) ?? null,
    failNext: (error: Error) => {
      failure = error;
    },
  };
};

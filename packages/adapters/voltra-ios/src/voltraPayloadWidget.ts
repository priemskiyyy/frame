import type {
  JsonRecord,
  WidgetAdapter,
  WidgetDefinition,
} from "@priemskiyyy/frame/adapter";

import type { VoltraPayloadOptions } from "src/types/VoltraPayloadOptions";
import { attemptRender } from "src/utils/attemptRender";
import {
  NOT_APPLE_REASON,
  NOT_APPLE_REMEDIATION,
} from "src/utils/constants/unavailable";
import { WRITE_DOMAIN_PREFIX } from "src/utils/constants/writeDomain";

/**
 * Draws a widget definition as a Voltra iOS home screen widget in payload mode
 * through the `@use-voltra/ios-client` you inject: creating the adapter calls
 * nothing, and opening it asks whether this runtime is Apple. Every call
 * renders your Voltra JSX first, where a throw is `failed`, and answers `sdk-
 * promise-resolved` once the SDK's promise resolves.
 *
 * @example
 * ```ts
 * import * as VoltraClient from "@use-voltra/ios-client";
 *
 * const frame = new Frame({
 *   widgets: { streak },
 *   adapters: [voltraPayloadWidget(streak, { sdk: VoltraClient, render: renderStreak })],
 * });
 * ```
 */
export const voltraPayloadWidget = <
  TName extends string,
  TData extends JsonRecord,
>(
  definition: WidgetDefinition<TName, TData>,
  {
    sdk,
    render,
    available = () => sdk.assertRunningOnApple(),
  }: VoltraPayloadOptions<NoInfer<TData>>,
): WidgetAdapter<TData, TName> => ({
  name: "voltra-ios",
  definition,
  open: () => {
    if (!available()) {
      return {
        status: "unavailable",
        reason: NOT_APPLE_REASON,
        remediation: NOT_APPLE_REMEDIATION,
      };
    }

    return {
      status: "opened",
      session: {
        writeDomain: `${WRITE_DOMAIN_PREFIX}${definition.name}`,
        publish: async (data) => {
          const attempt = attemptRender(() => render(data));

          if (attempt.status === "failed") {
            return attempt;
          }

          await sdk.updateWidget(definition.name, attempt.rendered);

          return { status: "submitted", evidence: "sdk-promise-resolved" };
        },
        publishTimeline: async (entries) => {
          const attempt = attemptRender(() =>
            entries.map(({ at, data }) => ({
              date: new Date(at),
              variants: render(data),
            })),
          );

          if (attempt.status === "failed") {
            return attempt;
          }

          await sdk.scheduleWidget(definition.name, attempt.rendered);

          return { status: "submitted", evidence: "sdk-promise-resolved" };
        },
        reload: async () => {
          await sdk.reloadWidgets([definition.name]);

          return { status: "submitted", evidence: "sdk-promise-resolved" };
        },
      },
    };
  },
});

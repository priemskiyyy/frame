import type {
  JsonRecord,
  WidgetAdapter,
  WidgetDefinition,
} from "@priemskiyyy/frame/adapter";

import type { ExpoWidgetOptions } from "src/types/ExpoWidgetOptions";
import {
  NO_APP_GROUP_REASON,
  NO_APP_GROUP_REMEDIATION,
  NO_NATIVE_SIDE_REASON,
  NO_NATIVE_SIDE_REMEDIATION,
} from "src/utils/constants/unavailable";
import { WRITE_DOMAIN_PREFIX } from "src/utils/constants/writeDomain";
import { getNullRefusal } from "src/utils/getNullRefusal";
import { toError } from "src/utils/toError";

/**
 * Draws a widget definition as an iOS home screen widget through the `expo-
 * widgets` you inject: creating the adapter calls nothing, and opening it
 * registers `render` with the native extension. Every submission answers `sdk-
 * call-returned`, and where the module has no shared directory the adapter is
 * unavailable.
 *
 * @example
 * ```ts
 * import * as ExpoWidgets from "expo-widgets";
 *
 * const frame = new Frame({
 *   widgets: { streak },
 *   adapters: [expoWidget(streak, { sdk: ExpoWidgets, render: StreakView })],
 * });
 * ```
 */
export const expoWidget = <TName extends string, TData extends JsonRecord>(
  definition: WidgetDefinition<TName, TData>,
  { sdk, render }: ExpoWidgetOptions<NoInfer<TData>>,
): WidgetAdapter<TData, TName> => ({
  name: "expo",
  definition,
  open: () => {
    if (sdk.widgetsDirectory === null) {
      return {
        status: "unavailable",
        reason: NO_APP_GROUP_REASON,
        remediation: NO_APP_GROUP_REMEDIATION,
      };
    }

    if (sdk.widgetsDirectory === "") {
      return {
        status: "unavailable",
        reason: NO_NATIVE_SIDE_REASON,
        remediation: NO_NATIVE_SIDE_REMEDIATION,
      };
    }

    const widget = sdk.createWidget(definition.name, render);

    return {
      status: "opened",
      session: {
        writeDomain: `${WRITE_DOMAIN_PREFIX}${definition.name}`,
        publish: (data) => {
          const refusal = getNullRefusal(data, "");

          if (refusal !== null) {
            return refusal;
          }

          widget.updateSnapshot(data);

          return { status: "submitted", evidence: "sdk-call-returned" };
        },
        publishTimeline: (entries) => {
          for (const [index, { data }] of entries.entries()) {
            const refusal = getNullRefusal(data, `entries[${index}].data`);

            if (refusal === null) {
              continue;
            }

            return refusal;
          }

          widget.updateTimeline(
            entries.map(({ at, data }) => ({
              date: new Date(at),
              props: data,
            })),
          );

          return { status: "submitted", evidence: "sdk-call-returned" };
        },
        reload: () => {
          widget.reload();

          return { status: "submitted", evidence: "sdk-call-returned" };
        },
        readback: async () => {
          try {
            const stored = await widget.getTimeline();

            return {
              status: "read",
              entries: stored.map(({ date, props }) => ({
                at: date.getTime(),
                data: props,
              })),
            };
          } catch (error) {
            return {
              status: "failed",
              error: toError(error),
            };
          }
        },
      },
    };
  },
});

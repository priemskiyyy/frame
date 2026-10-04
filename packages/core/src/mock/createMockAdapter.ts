import type { HeldCall } from "src/mock/types/HeldCall";
import type { MockAdapterOptions } from "src/mock/types/MockAdapterOptions";
import type { MockCall } from "src/mock/types/MockCall";
import type { MockPlan } from "src/mock/types/MockPlan";
import type { MockResolution } from "src/mock/types/MockResolution";
import type { MockWidgetControl } from "src/mock/types/MockWidgetControl";
import { toReadbackAnswer } from "src/mock/utils/toReadbackAnswer";
import { toSubmissionResult } from "src/mock/utils/toSubmissionResult";
import type { JsonRecord } from "src/types/JsonRecord";
import type { TimelineEntry } from "src/types/TimelineEntry";
import type { WidgetAdapter } from "src/types/WidgetAdapter";
import type { WidgetDefinition } from "src/types/WidgetDefinition";

const SUCCEED = Object.freeze({ outcome: "succeed" } satisfies MockPlan);

/**
 * A deterministic adapter for application and core tests that records every
 * call, answers `simulated` evidence, and holds, fails or hangs on command. It
 * provides every operation, so a test can exercise a timeline, a reload and a
 * readback.
 *
 * @example
 * ```ts
 * const { adapter, control } = createMockAdapter(streak);
 * const frame = new Frame({ widgets: { streak }, adapters: [adapter] });
 *
 * control.script({ outcome: "fail" });
 * ```
 */
export const createMockAdapter = <
  TName extends string,
  TData extends JsonRecord,
>(
  definition: WidgetDefinition<TName, TData>,
  options: MockAdapterOptions = {},
): {
  adapter: WidgetAdapter<TData, TName>;
  control: MockWidgetControl;
} => {
  const plans: MockPlan[] = [];
  const held: HeldCall[] = [];
  const calls: MockCall[] = [];
  let stored: TimelineEntry<JsonRecord>[] = [];
  let sessions = 0;

  const getInstant = () => {
    if (options.clock === undefined) {
      return 0;
    }

    return options.clock.now();
  };

  const perform = <TAnswer>(
    call: MockCall,
    answer: (resolution: MockResolution) => TAnswer,
  ): TAnswer | Promise<TAnswer> => {
    calls.push(call);

    const plan = plans.shift() ?? SUCCEED;

    if (plan.outcome !== "hold") {
      return answer(plan);
    }

    return new Promise<TAnswer>((resolve, reject) => {
      const finish = (resolution: MockResolution) => {
        const index = held.indexOf(heldCall);

        // Finished already: a second release must not take another call's place.
        if (index === -1) {
          return;
        }

        held.splice(index, 1);

        try {
          resolve(answer(resolution));
        } catch (error) {
          reject(error);
        }
      };

      const heldCall: HeldCall = {
        call,
        release: () => finish({ outcome: "succeed" }),
        fail: (error) => finish({ outcome: "fail", error }),
        indeterminate: (error, storedAnyway) =>
          finish({ outcome: "indeterminate", error, stored: storedAnyway }),
        throw: (error, storedAnyway) =>
          finish({ outcome: "throw", error, stored: storedAnyway }),
      };

      held.push(heldCall);
    });
  };

  const control: MockWidgetControl = {
    script: (...next) => {
      plans.push(...next);
    },
    held: () => [...held],
    calls: () => [...calls],
    stored: () => [...stored],
    seed: (entries) => {
      stored = [...entries];
    },
    sessions: () => sessions,
  };

  const adapter: WidgetAdapter<TData, TName> = {
    name: options.name ?? "mock",
    definition,
    open: () => {
      if (options.unavailable !== undefined) {
        return {
          status: "unavailable",
          reason: options.unavailable.reason,
          remediation: options.unavailable.remediation ?? null,
        };
      }

      sessions += 1;

      return {
        status: "opened",
        session: {
          writeDomain: options.writeDomain ?? `mock:${definition.name}`,
          publish: (data) =>
            perform({ operation: "publish", data }, (resolution) =>
              toSubmissionResult(resolution, () => {
                stored = [{ at: getInstant(), data }];
              }),
            ),
          publishTimeline: (entries) =>
            perform({ operation: "publishTimeline", entries }, (resolution) =>
              toSubmissionResult(resolution, () => {
                stored = [...entries];
              }),
            ),
          reload: () =>
            perform({ operation: "reload" }, (resolution) =>
              toSubmissionResult(resolution, () => {}),
            ),
          readback: () =>
            perform({ operation: "readback" }, (resolution) =>
              toReadbackAnswer(resolution, [...stored]),
            ),
          dispose: () => {
            sessions -= 1;
          },
        },
      };
    },
  };

  return { adapter, control };
};

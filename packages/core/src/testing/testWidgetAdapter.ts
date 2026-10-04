import type { ConformanceReport } from "src/testing/types/ConformanceReport";
import type { WidgetAdapterHarness } from "src/testing/types/WidgetAdapterHarness";
import type { WidgetAdapter } from "src/types/WidgetAdapter";
import { createTestClock } from "src/mock/createTestClock";
import { Frame } from "src/utils/Frame";

type Check = {
  name: string;
  applies: (harness: WidgetAdapterHarness) => boolean;
  run: (harness: WidgetAdapterHarness) => Promise<void | "skipped">;
};

const assert: (condition: boolean, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (condition) {
    return;
  }

  throw new Error(message);
};

const open = async (adapter: WidgetAdapter) => {
  const opening = await adapter.open();

  assert(
    opening.status === "opened",
    "The adapter was expected to open, and answered unavailable.",
  );

  return opening.session;
};

// Each check gets its own adapter, so none passes on what another left behind.
const CHECKS: Check[] = [
  {
    name: "creating the adapter calls the provider nothing",
    applies: () => true,
    run: async (harness) => {
      const adapter = harness.create();

      assert(
        typeof adapter.name === "string" && adapter.name !== "",
        "An adapter names itself, for diagnostics.",
      );
      assert(
        harness.calls() === 0,
        "The adapter called its provider while being created.",
      );
    },
  },
  {
    name: "opening answers a session or a reason, and a reason has no provider call",
    applies: () => true,
    run: async (harness) => {
      const opening = await harness.create().open();

      if (opening.status === "unavailable") {
        assert(
          opening.reason !== "",
          "An unavailable adapter says why, in a reason.",
        );

        return;
      }

      assert(
        opening.session.writeDomain !== "",
        "A session names its write domain.",
      );
      assert(
        typeof opening.session.publish === "function",
        "A session publishes snapshots.",
      );
    },
  },
  {
    name: "every opening is a fresh session in the same write domain",
    applies: () => true,
    run: async (harness) => {
      const adapter = harness.create();
      const first = await open(adapter);
      const second = await open(adapter);

      assert(first !== second, "Each opening is a session of its own.");
      assert(
        first.writeDomain === second.writeDomain,
        "Sessions of one adapter share one write domain, or two of them could overwrite each other.",
      );
    },
  },
  {
    name: "a snapshot is submitted with evidence",
    applies: () => true,
    run: async (harness) => {
      const adapter = harness.create();
      const session = await open(adapter);
      const answer = await session.publish(adapter.definition.fallback);

      assert(
        answer.status === "submitted",
        `A valid snapshot was answered ${answer.status}.`,
      );
      assert(
        ["sdk-call-returned", "sdk-promise-resolved", "simulated"].includes(
          answer.evidence,
        ),
        "A submission names the boundary it reached.",
      );
    },
  },
  {
    name: "a Frame publishes through the adapter and ends submitted",
    applies: () => true,
    run: async (harness) => {
      const adapter = harness.create();

      const frame = new Frame({
        widgets: { subject: adapter.definition },
        adapters: [adapter],
        clock: createTestClock({ now: 1_000 }),
      });

      const outcome = await frame
        .widget("subject")
        .publish(adapter.definition.fallback);

      assert(
        outcome.status === "submitted",
        `Frame ended a valid publication ${outcome.status}.`,
      );

      frame.dispose();
    },
  },
  {
    name: "a failing provider call is never answered submitted",
    applies: (harness) => harness.failNextCall !== undefined,
    run: async (harness) => {
      const adapter = harness.create();
      const session = await open(adapter);

      harness.failNextCall?.();

      const answer = await Promise.resolve()
        .then(() => session.publish(adapter.definition.fallback))
        .catch(() => ({ status: "threw" }));

      assert(
        answer.status !== "submitted" && answer.status !== "skipped",
        `A provider call that failed was answered ${answer.status}: a thrown call is indeterminate, never a success.`,
      );
    },
  },
  {
    name: "a timeline is replaced whole, when the adapter has one",
    applies: () => true,
    run: async (harness) => {
      const adapter = harness.create();
      const session = await open(adapter);

      if (session.publishTimeline === undefined) {
        return "skipped";
      }

      const answer = await session.publishTimeline([
        { at: 0, data: adapter.definition.fallback },
      ]);

      assert(
        answer.status === "submitted",
        `A valid timeline was answered ${answer.status}.`,
      );
    },
  },
  {
    name: "a reload is acknowledged, when the adapter has one",
    applies: () => true,
    run: async (harness) => {
      const session = await open(harness.create());

      if (session.reload === undefined) {
        return "skipped";
      }

      const answer = await session.reload();

      assert(
        answer.status === "submitted" || answer.status === "skipped",
        `A reload request was answered ${answer.status}.`,
      );
    },
  },
  {
    name: "a readback answers entries with an instant each, when the adapter has one",
    applies: () => true,
    run: async (harness) => {
      const adapter = harness.create();
      const session = await open(adapter);

      await session.publish(adapter.definition.fallback);

      if (session.readback === undefined) {
        return "skipped";
      }

      const answer = await session.readback();

      assert(
        answer.status === "read",
        `A readback was answered ${answer.status}.`,
      );
      assert(
        answer.entries.every((entry) => Number.isSafeInteger(entry.at)),
        "Every entry of a readback has an instant of epoch milliseconds.",
      );
    },
  },
  {
    name: "disposing a session releases it once without throwing",
    applies: () => true,
    run: async (harness) => {
      const session = await open(harness.create());

      await session.dispose?.();
    },
  },
  {
    name: "an unavailable adapter answers its reason without a provider call",
    applies: (harness) => harness.createUnavailable !== undefined,
    run: async (harness) => {
      const adapter = harness.createUnavailable?.();

      assert(
        adapter !== undefined,
        "The harness makes an unavailable adapter.",
      );

      const opening = await adapter.open();

      assert(
        opening.status === "unavailable" && opening.reason !== "",
        "The adapter was expected to answer unavailable with a reason.",
      );
      assert(
        harness.calls() === 0,
        "An unavailable adapter called its provider.",
      );
    },
  },
];

/**
 * Runs the checks every adapter must pass: it is cold, names its write
 * domain, answers `submitted` only for a call that returned, never answers a
 * failed call as a success, and keeps each operation to its contract. A check
 * that fails throws, and the report names the checks that did not apply, such
 * as the one for an operation the adapter does not have.
 *
 * @example
 * ```ts
 * test("expo conforms", async () => {
 *   const { skipped } = await testWidgetAdapter(harness);
 *
 *   expect(skipped).toEqual([]);
 * });
 * ```
 */
export const testWidgetAdapter = async (
  harness: WidgetAdapterHarness,
): Promise<ConformanceReport> => {
  const passed: string[] = [];
  const skipped: string[] = [];

  for (const check of CHECKS) {
    if (!check.applies(harness)) {
      skipped.push(check.name);
      continue;
    }

    if ((await check.run(harness)) === "skipped") {
      skipped.push(check.name);
      continue;
    }

    passed.push(check.name);
  }

  return { passed, skipped };
};

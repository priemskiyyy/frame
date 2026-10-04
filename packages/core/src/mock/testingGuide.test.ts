import { expect, test } from "vitest";
import { z } from "zod";
import { createMockAdapter } from "src/mock/createMockAdapter";
import { createTestClock } from "src/mock/createTestClock";
import { settle } from "src/mock/settle";
import { Frame } from "src/utils/Frame";
import { widget } from "src/utils/widget";

const streak = widget({
  name: "StreakWidget",
  schema: z.object({ days: z.number() }),
  fallback: { days: 0 },
});

test("docs/testing.md: the first call is held while a second waits, and both are submitted in order", async () => {
  const { adapter, control } = createMockAdapter(streak);
  const frame = new Frame({ widgets: { streak }, adapters: [adapter] });
  const handle = frame.widget("streak");

  control.script({ outcome: "hold" });

  const first = handle.publish({ days: 1 });

  await settle();

  const second = handle.publish({ days: 2 });

  control.held()[0]?.release();

  expect((await first).status).toBe("submitted");
  expect((await second).status).toBe("submitted");
});

test("docs/testing.md: a stuck call ends indeterminate once the clock passes the timeout", async () => {
  const { adapter, control } = createMockAdapter(streak);
  const clock = createTestClock({ now: 1_760_000_000_000 });

  const frame = new Frame({
    widgets: { streak },
    adapters: [adapter],
    clock,
    timeout: 500,
  });

  control.script({ outcome: "hold" });

  const stuck = frame.widget("streak").publish({ days: 1 });

  await settle();
  clock.advance(500);

  expect((await stuck).status).toBe("indeterminate");
});

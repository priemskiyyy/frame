import { expect, test } from "vitest";

import { createMockStreakFrame } from "src/frames/createMockStreakFrame.fixture";
import { projectStreak } from "src/domain/projectStreak";
import { EVENT_LOG_CAPACITY } from "src/utils/constants/ledger";
import { createEventLog } from "src/utils/createEventLog";
import { ACCOUNTS } from "src/utils/constants/accounts";

test("the newest event is first, and each one keeps the number it was logged under", async () => {
  const { frame } = createMockStreakFrame();
  const log = createEventLog(frame);

  await frame
    .widget("streak")
    .publish(projectStreak(ACCOUNTS.ada.streak, 1_760_000_000_000));

  expect(log.get().map(({ id, event }) => [id, event.type])).toEqual([
    [4, "request-settled"],
    [3, "widget-ready"],
    [2, "widget-preparing"],
    [1, "request-accepted"],
  ]);
});

test("the log is the same array until an event arrives, and a subscriber hears each one", async () => {
  const { frame } = createMockStreakFrame();
  const log = createEventLog(frame);
  let heard = 0;

  const unsubscribe = log.subscribe(() => {
    heard += 1;
  });

  expect(log.get()).toBe(log.get());

  await frame.context({ reset: "preserve" });

  expect(heard).toBe(1);

  unsubscribe();
  await frame.context({ reset: "preserve" });

  expect(heard).toBe(1);
});

test("the log keeps only its capacity, and ids keep counting", async () => {
  const { frame } = createMockStreakFrame();
  const log = createEventLog(frame);

  for (let index = 0; index < EVENT_LOG_CAPACITY + 5; index += 1) {
    await frame.context({ reset: "preserve" });
  }

  expect(log.get()).toHaveLength(EVENT_LOG_CAPACITY);
  expect(log.get()[0]?.id).toBe(EVENT_LOG_CAPACITY + 5);
});

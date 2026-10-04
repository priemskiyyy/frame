import { settle } from "@priemskiyyy/frame/mock";
import { expect, test } from "vitest";

import { projectStreak } from "src/domain/projectStreak";
import { createMockStreakFrame } from "src/frames/createMockStreakFrame.fixture";
import { ACCOUNTS } from "src/utils/constants/accounts";
import { FAULTS } from "src/utils/constants/faults";
import { SIMULATED_TIMEOUT } from "src/utils/constants/simulated";

const data = projectStreak(ACCOUNTS.ada.streak, 1_760_000_000_000);

const next = projectStreak(
  { ...ACCOUNTS.ada.streak, days: 13 },
  1_760_000_000_000,
);

const armed = (id: string) => {
  const mocked = createMockStreakFrame({ timeout: SIMULATED_TIMEOUT });
  const fault = FAULTS.find((candidate) => candidate.id === id);

  if (fault === undefined) {
    throw new Error(`There is no ${id} fault.`);
  }

  mocked.control.script(fault.plan);

  return mocked;
};

test("a call that fails ends failed, a call that crashes ends indeterminate, and a skipped call ends skipped", async () => {
  const failed = armed("fail");
  const crashed = armed("crash");
  const skipped = armed("skip");

  expect((await failed.frame.widget("streak").publish(data)).status).toBe(
    "failed",
  );
  expect(await crashed.frame.widget("streak").publish(data)).toMatchObject({
    status: "indeterminate",
    reason: "provider-error",
  });
  expect((await skipped.frame.widget("streak").publish(data)).status).toBe(
    "skipped",
  );
});

test("a call that goes quiet ends indeterminate at the shared timeout, and the next publish is blocked until it is released", async () => {
  const { frame, control, clock } = armed("quiet");
  const widget = frame.widget("streak");
  const quiet = widget.publish(data);

  await settle();
  clock.advance(SIMULATED_TIMEOUT);

  expect(await quiet).toMatchObject({
    status: "indeterminate",
    reason: "timeout",
  });
  expect((await widget.publish(next, { force: true })).status).toBe("blocked");
  expect(control.held()).toHaveLength(1);
});

import { expect, test } from "vitest";
import { createMockAdapter } from "src/mock/createMockAdapter";
import { createTestClock } from "src/mock/createTestClock";
import { DEFAULT_LIMITS } from "src/utils/constants/limits";
import { streak } from "src/utils/Frame.fixture";
import { Lane } from "src/utils/internal/lanes/Lane";
import { WidgetHost } from "src/utils/internal/widgets/WidgetHost";
import { WidgetRuntime } from "src/utils/internal/widgets/WidgetRuntime";

test("a runtime follows the lane of its opened adapter, and stops following it when it is retired", async () => {
  const clock = createTestClock();
  const { adapter } = createMockAdapter(streak);

  const lane = new Lane({
    name: "domain",
    clock,
    timeout: 100,
    emit: () => {},
  });

  const subscribe = lane.subscribe;
  let following = 0;

  lane.subscribe = (listener) => {
    const stop = subscribe(listener);

    following += 1;

    return () => {
      following -= 1;
      stop();
    };
  };

  const host = new WidgetHost({
    key: "streak",
    adapters: [adapter],
    clock,
    timeout: 100,
    acquireLane: () => lane,
    emit: () => {},
  });

  const runtime = new WidgetRuntime({
    key: "streak",
    definition: streak,
    host,
    fallback: { snapshot: { state: "empty" }, canonical: '{"state":"empty"}' },
    clock,
    timeout: 100,
    limits: DEFAULT_LIMITS,
    nextRequest: () => 1,
    emit: () => {},
    onChange: () => {},
    onAssign: () => {},
  });

  expect(following).toBe(0);

  await host.acquire({ retry: false });

  expect(following).toBe(1);

  runtime.retire();

  expect(following).toBe(0);
});

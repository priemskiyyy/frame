import { expect, test } from "vitest";
import { createTestClock } from "src/mock/createTestClock";
import { settle } from "src/mock/settle";
import type { DiagnosticEventInput } from "src/types/internal/DiagnosticEventInput";
import type { LaneStop } from "src/types/internal/LaneStop";
import type { LaneTask } from "src/types/internal/LaneTask";
import { captureRethrown } from "src/utils/common/captureRethrown.fixture";
import { Lane } from "src/utils/internal/lanes/Lane";

const createLane = () => {
  const clock = createTestClock();
  const events: DiagnosticEventInput[] = [];

  const lane = new Lane({
    name: "domain",
    clock,
    timeout: 100,
    emit: (build) => events.push(build()),
  });

  return { lane, clock, events };
};

const createTask = (name: string, log: string[]) => {
  const stops: LaneStop[] = [];

  let answer: () => void = () => {};

  let reject: (error: Error) => void = () => {};

  const task: LaneTask = {
    start: () =>
      new Promise<void>((resolve, fail) => {
        log.push(`start ${name}`);
        answer = resolve;
        reject = fail;
      }),
    onStop: (stop) => stops.push(stop),
  };

  return {
    task,
    stops,
    answer: () => answer(),
    reject: (error: Error) => reject(error),
  };
};

test("tasks run one at a time, in the order they were queued", async () => {
  const { lane } = createLane();
  const log: string[] = [];
  const first = createTask("first", log);
  const second = createTask("second", log);

  lane.enqueue(first.task);
  lane.enqueue(second.task);

  expect(log).toEqual(["start first"]);

  first.answer();
  await settle();

  expect(log).toEqual(["start first", "start second"]);
});

test("queued tasks start in the order they were queued, however many", async () => {
  const { lane } = createLane();
  const log: string[] = [];
  const tasks = ["a", "b", "c"].map((name) => createTask(name, log));

  for (const { task } of tasks) {
    lane.enqueue(task);
  }

  for (const { answer } of tasks) {
    answer();
    await settle();
  }

  expect(log).toEqual(["start a", "start b", "start c"]);
});

test("a task that answers in time is never stopped", async () => {
  const { lane } = createLane();
  const task = createTask("only", []);

  lane.enqueue(task.task);
  task.answer();
  await settle();

  expect(task.stops).toEqual([]);
});

test("a task that rejects, or throws before returning a promise, is stopped as threw", async () => {
  const { lane } = createLane();
  const rejected = createTask("rejected", []);
  const error = new Error("rejected");
  const thrown: LaneStop[] = [];

  lane.enqueue(rejected.task);
  rejected.reject(error);
  await settle();
  lane.enqueue({
    start: () => {
      throw new Error("sync");
    },
    onStop: (stop) => thrown.push(stop),
  });
  await settle();

  expect(rejected.stops).toEqual([{ status: "threw", error }]);
  expect(thrown).toMatchObject([
    { status: "threw", error: { message: "sync" } },
  ]);
  expect(lane.isBlocked()).toBe(false);
});

test("a task that outlives the timeout is stopped as timeout and the lane blocks", async () => {
  const { lane, clock, events } = createLane();
  const task = createTask("stuck", []);

  lane.enqueue(task.task);
  clock.advance(100);

  expect(task.stops).toEqual([{ status: "timeout" }]);
  expect(lane.isBlocked()).toBe(true);
  expect(events).toEqual([
    { type: "write-domain-blocked", writeDomain: { name: "domain" } },
  ]);
});

test("a blocked lane refuses new tasks and drains the ones that waited", async () => {
  const { lane, clock } = createLane();
  const log: string[] = [];
  const stuck = createTask("stuck", log);
  const waiting = createTask("waiting", log);
  const late = createTask("late", log);

  lane.enqueue(stuck.task);
  lane.enqueue(waiting.task);
  clock.advance(100);
  lane.enqueue(late.task);

  expect(waiting.stops).toEqual([{ status: "blocked" }]);
  expect(late.stops).toEqual([{ status: "blocked" }]);
  expect(log).toEqual(["start stuck"]);
});

test("the lane reopens, quietly for the caller, when the stuck call finally answers", async () => {
  const { lane, clock, events } = createLane();
  const stuck = createTask("stuck", []);

  lane.enqueue(stuck.task);
  clock.advance(100);
  stuck.answer();
  await settle();

  expect(stuck.stops).toEqual([{ status: "timeout" }]);
  expect(lane.isBlocked()).toBe(false);
  expect(events.at(-1)).toEqual({
    type: "write-domain-unblocked",
    writeDomain: { name: "domain" },
    result: { status: "answered" },
  });

  const next = createTask("next", []);

  lane.enqueue(next.task);
  next.answer();
  await settle();

  expect(next.stops).toEqual([]);
});

test("a stuck call that finally rejects reopens the lane and says how it ended", async () => {
  const { lane, clock, events } = createLane();
  const stuck = createTask("stuck", []);

  lane.enqueue(stuck.task);
  clock.advance(100);
  stuck.reject(new Error("late failure"));
  await settle();

  expect(events.at(-1)).toMatchObject({
    type: "write-domain-unblocked",
    result: { status: "threw" },
  });
  expect(lane.isBlocked()).toBe(false);
});

test("a task that has not started can be cancelled, and one that has cannot", async () => {
  const { lane } = createLane();
  const log: string[] = [];
  const running = createTask("running", log);
  const queued = createTask("queued", log);

  const cancelRunning = lane.enqueue(running.task);
  const cancelQueued = lane.enqueue(queued.task);

  cancelQueued();
  cancelQueued();
  cancelRunning();
  running.answer();
  await settle();

  expect(log).toEqual(["start running"]);
  expect(queued.stops).toEqual([]);
});

test("a task the lane refused has nothing left to cancel", () => {
  const { lane } = createLane();
  const task = createTask("late", []);

  lane.dispose();
  lane.enqueue(task.task)();

  expect(task.stops).toEqual([{ status: "disposed" }]);
});

test("disposing stops queued tasks as disposed and a running one as abandoned", async () => {
  const { lane } = createLane();
  const running = createTask("running", []);
  const queued = createTask("queued", []);

  lane.enqueue(running.task);
  lane.enqueue(queued.task);
  lane.dispose();

  expect(running.stops).toEqual([{ status: "abandoned" }]);
  expect(queued.stops).toEqual([{ status: "disposed" }]);

  const after = createTask("after", []);

  lane.enqueue(after.task);

  expect(after.stops).toEqual([{ status: "disposed" }]);
});

test("a task that answers after disposal is ignored", async () => {
  const { lane, events } = createLane();
  const running = createTask("running", []);

  lane.enqueue(running.task);
  lane.dispose();
  running.answer();
  await settle();

  expect(running.stops).toEqual([{ status: "abandoned" }]);
  expect(events).toEqual([]);
});

test("a hung task is not stopped a second time when the lane is disposed", () => {
  const { lane, clock } = createLane();
  const stuck = createTask("stuck", []);

  lane.enqueue(stuck.task);
  clock.advance(100);
  lane.dispose();

  expect(stuck.stops).toEqual([{ status: "timeout" }]);
});

test("a task enqueued from inside another's stop runs in its turn", async () => {
  const { lane } = createLane();
  const log: string[] = [];
  const next = createTask("next", log);

  const first: LaneTask = {
    start: () => Promise.reject(new Error("fail")),
    onStop: () => lane.enqueue(next.task),
  };

  lane.enqueue(first);
  await settle();

  expect(log).toEqual(["start next"]);
});

test("a lane tells its listeners when a task is queued, when it starts and when it ends", async () => {
  const { lane } = createLane();
  const task = createTask("only", []);
  let heard = 0;

  lane.subscribe(() => {
    heard += 1;
  });
  lane.enqueue(task.task);

  expect(heard).toBe(2);

  task.answer();
  await settle();

  expect(heard).toBe(3);
});

test("a deadline that fires for a task that already finished does nothing", async () => {
  const { lane, clock } = createLane();
  const task = createTask("only", []);

  lane.enqueue(task.task);
  task.answer();
  await settle();
  clock.advance(1000);

  expect(task.stops).toEqual([]);
  expect(lane.isBlocked()).toBe(false);
});

test("a task's own timer is cancelled when it answers", async () => {
  const { lane, clock } = createLane();
  const task = createTask("only", []);

  lane.enqueue(task.task);

  expect(clock.pending()).toBe(1);

  task.answer();
  await settle();

  expect(clock.pending()).toBe(0);
});

test("cancelling a queued task tells the lane's listeners", () => {
  const { lane } = createLane();
  const running = createTask("running", []);
  const queued = createTask("queued", []);
  let heard = 0;

  lane.enqueue(running.task);

  const cancel = lane.enqueue(queued.task);

  lane.subscribe(() => {
    heard += 1;
  });
  cancel();

  expect(heard).toBe(1);
});

test("disposing a lane tells its listeners once", () => {
  const { lane } = createLane();
  let heard = 0;

  lane.subscribe(() => {
    heard += 1;
  });
  lane.dispose();

  expect(heard).toBe(1);
});

test("a listener that unsubscribed hears nothing more", () => {
  const { lane } = createLane();
  let heard = 0;

  const stop = lane.subscribe(() => {
    heard += 1;
  });

  stop();
  lane.enqueue(createTask("only", []).task);

  expect(heard).toBe(0);
});

test("a hung call that answers after the lane was disposed announces nothing", async () => {
  const { lane, clock, events } = createLane();
  const stuck = createTask("stuck", []);

  lane.enqueue(stuck.task);
  clock.advance(100);
  lane.dispose();
  stuck.answer();
  await settle();

  expect(events).toEqual([
    { type: "write-domain-blocked", writeDomain: { name: "domain" } },
  ]);
});

test("a task whose stop handler throws neither stops the lane nor hides the error", async () => {
  const { lane } = createLane();
  const rethrown = captureRethrown();
  const log: string[] = [];
  const next = createTask("next", log);

  lane.enqueue({
    start: () => Promise.reject(new Error("native")),
    onStop: () => {
      throw new Error("stop handler failed");
    },
  });
  lane.enqueue(next.task);
  await settle();

  expect(log).toEqual(["start next"]);
  expect(rethrown()).toEqual([new Error("stop handler failed")]);
});

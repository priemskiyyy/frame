import { expect, test } from "vitest";
import { z } from "zod";
import { createMockAdapter } from "src/mock/createMockAdapter";
import { createTestClock } from "src/mock/createTestClock";
import { widget } from "src/utils/widget";

const counter = widget({
  name: "CounterWidget",
  schema: z.object({ count: z.number() }),
  fallback: { count: 0 },
});

const open = async (
  adapter: ReturnType<
    typeof createMockAdapter<"CounterWidget", { count: number }>
  >["adapter"],
) => {
  const opening = await adapter.open();

  if (opening.status !== "opened") {
    throw new Error("The mock did not open.");
  }

  return opening.session;
};

test("a mock adapter is cold, names itself and its write domain", async () => {
  const { adapter, control } = createMockAdapter(counter);

  expect(adapter.name).toBe("mock");
  expect(control.sessions()).toBe(0);

  const session = await open(adapter);

  expect(session.writeDomain).toBe("mock:CounterWidget");
  expect(control.sessions()).toBe(1);

  session.dispose?.();

  expect(control.sessions()).toBe(0);
});

test("a write domain can be chosen", async () => {
  const { adapter } = createMockAdapter(counter, { writeDomain: "custom" });

  expect((await open(adapter)).writeDomain).toBe("custom");
});

test("an unavailable mock answers unavailable and opens nothing", async () => {
  const { adapter, control } = createMockAdapter(counter, {
    unavailable: { reason: "No host.", remediation: "Rebuild." },
  });

  expect(await adapter.open()).toEqual({
    status: "unavailable",
    reason: "No host.",
    remediation: "Rebuild.",
  });
  expect(control.sessions()).toBe(0);
});

test("an unplanned call succeeds with simulated evidence, and stores what it was given", async () => {
  const { adapter, control } = createMockAdapter(counter);
  const session = await open(adapter);

  expect(await session.publish({ count: 1 })).toEqual({
    status: "submitted",
    evidence: "simulated",
  });
  expect(control.stored()).toEqual([{ at: 0, data: { count: 1 } }]);
  expect(control.calls()).toEqual([
    { operation: "publish", data: { count: 1 } },
  ]);
});

test("stored entries are stamped by the clock it is given", async () => {
  const clock = createTestClock({ now: 500 });
  const { adapter, control } = createMockAdapter(counter, { clock });
  const session = await open(adapter);

  await session.publish({ count: 1 });

  expect(control.stored()).toEqual([{ at: 500, data: { count: 1 } }]);
});

test("planned calls are used in order, one each", async () => {
  const { adapter, control } = createMockAdapter(counter);
  const session = await open(adapter);

  control.script({ outcome: "skip" }, { outcome: "fail" });

  expect((await session.publish({ count: 1 })).status).toBe("skipped");
  expect((await session.publish({ count: 2 })).status).toBe("failed");
  expect((await session.publish({ count: 3 })).status).toBe("submitted");
});

test("an indeterminate or throwing call stores what it was given only when it says so", async () => {
  const { adapter, control } = createMockAdapter(counter);
  const session = await open(adapter);

  control.script(
    { outcome: "indeterminate" },
    { outcome: "indeterminate", stored: true },
    { outcome: "throw", error: new Error("a") },
    { outcome: "throw", error: new Error("b"), stored: true },
  );

  await session.publish({ count: 1 });

  expect(control.stored()).toEqual([]);

  await session.publish({ count: 2 });

  expect(control.stored()).toEqual([{ at: 0, data: { count: 2 } }]);

  control.seed([]);

  expect(() => session.publish({ count: 3 })).toThrowError("a");
  expect(control.stored()).toEqual([]);
  expect(() => session.publish({ count: 4 })).toThrowError("b");

  expect(control.stored()).toEqual([{ at: 0, data: { count: 4 } }]);
});

test("a held call waits for the test and is finished four ways", async () => {
  const { adapter, control } = createMockAdapter(counter);
  const session = await open(adapter);

  control.script(
    { outcome: "hold" },
    { outcome: "hold" },
    { outcome: "hold" },
    { outcome: "hold" },
  );

  const released = session.publish({ count: 1 });
  const failed = session.publish({ count: 2 });
  const unknown = session.publish({ count: 3 });
  const thrown = session.publish({ count: 4 });

  expect(control.held().map(({ call }) => call)).toHaveLength(4);

  control.held()[0]?.release();
  control.held()[0]?.fail(new Error("no"));
  control.held()[0]?.indeterminate(new Error("maybe"), true);
  control.held()[0]?.throw(new Error("crash"));

  expect((await released).status).toBe("submitted");
  expect(await failed).toMatchObject({ status: "failed" });
  expect(await unknown).toMatchObject({ status: "indeterminate" });
  await expect(thrown).rejects.toThrowError("crash");
  expect(control.held()).toEqual([]);
});

test("a readback answers what is stored, and a failing plan answers failed or throws", async () => {
  const { adapter, control } = createMockAdapter(counter);
  const session = await open(adapter);

  control.seed([{ at: 1, data: { count: 9 } }]);

  expect(await session.readback?.()).toEqual({
    status: "read",
    entries: [{ at: 1, data: { count: 9 } }],
  });

  control.script({ outcome: "fail", error: new Error("no") });

  expect(await session.readback?.()).toMatchObject({
    status: "failed",
  });

  control.script({ outcome: "indeterminate", error: new Error("maybe") });

  expect(() => session.readback?.()).toThrowError("maybe");
});

test("seeding is not a call, and the stored list is a copy", async () => {
  const { control } = createMockAdapter(counter);

  control.seed([{ at: 1, data: { count: 1 } }]);

  expect(control.calls()).toEqual([]);

  control.stored().pop();

  expect(control.stored()).toHaveLength(1);
});

test("a timeline replace and a reload are recorded with their carried data", async () => {
  const { adapter, control } = createMockAdapter(counter);
  const session = await open(adapter);

  await session.publishTimeline?.([{ at: 1, data: { count: 1 } }]);
  await session.reload?.();

  expect(control.calls()).toEqual([
    { operation: "publishTimeline", entries: [{ at: 1, data: { count: 1 } }] },
    { operation: "reload" },
  ]);
  expect(control.stored()).toEqual([{ at: 1, data: { count: 1 } }]);
});

test("finishing a held call twice does not drop another held call", async () => {
  const { adapter, control } = createMockAdapter(counter);
  const session = await open(adapter);

  control.script({ outcome: "hold" }, { outcome: "hold" });
  session.publish({ count: 1 });
  session.publish({ count: 2 });

  const [first] = control.held();

  first?.release();
  first?.release();

  expect(control.held()).toHaveLength(1);
  expect(control.held()[0]?.call).toEqual({
    operation: "publish",
    data: { count: 2 },
  });
});

test("two mock adapters can be told apart by the name they were given", async () => {
  const { adapter } = createMockAdapter(counter, { name: "primary" });

  expect(adapter.name).toBe("primary");
  expect(createMockAdapter(counter).adapter.name).toBe("mock");
});

test("the held list is a copy, so emptying it holds no call back", async () => {
  const { adapter, control } = createMockAdapter(counter);
  const session = await open(adapter);

  control.script({ outcome: "hold" });
  session.publish({ count: 1 });
  control.held().pop();

  expect(control.held()).toHaveLength(1);
});

test("the calls list is a copy, so emptying it forgets no call", async () => {
  const { adapter, control } = createMockAdapter(counter);
  const session = await open(adapter);

  await session.publish({ count: 1 });
  control.calls().pop();

  expect(control.calls()).toHaveLength(1);
});

test("seeding and a stored timeline keep no reference to the caller's list", async () => {
  const { adapter, control } = createMockAdapter(counter);
  const session = await open(adapter);
  const seeded = [{ at: 1, data: { count: 1 } }];

  control.seed(seeded);
  seeded.pop();

  expect(control.stored()).toEqual([{ at: 1, data: { count: 1 } }]);

  const timeline = [{ at: 2, data: { count: 2 } }];

  await session.publishTimeline?.(timeline);
  timeline.pop();

  expect(control.stored()).toEqual([{ at: 2, data: { count: 2 } }]);
});

test("a readback answers a copy of what is stored", async () => {
  const { adapter, control } = createMockAdapter(counter);
  const session = await open(adapter);

  control.seed([{ at: 1, data: { count: 1 } }]);

  const answer = await session.readback?.();

  expect(answer?.status === "read" && answer.entries.pop()).toEqual({
    at: 1,
    data: { count: 1 },
  });
  expect(control.stored()).toHaveLength(1);
});

test("a failed or skipped call stores nothing", async () => {
  const { adapter, control } = createMockAdapter(counter);
  const session = await open(adapter);

  control.script({ outcome: "fail" }, { outcome: "skip" });

  expect((await session.publish({ count: 1 })).status).toBe("failed");
  expect((await session.publish({ count: 2 })).status).toBe("skipped");
  expect(control.stored()).toEqual([]);
});

test("a failure with no error says the mock was told to fail", async () => {
  const { adapter, control } = createMockAdapter(counter);
  const session = await open(adapter);

  control.script({ outcome: "fail" }, { outcome: "indeterminate" });

  expect(await session.publish({ count: 1 })).toEqual({
    status: "failed",
    error: new Error("The mock was told to fail."),
  });
  expect(await session.publish({ count: 2 })).toEqual({
    status: "indeterminate",
    error: new Error("The mock was told to fail."),
  });
});

test("a skipped readback reads what is stored, as a succeeding one does", async () => {
  const { adapter, control } = createMockAdapter(counter);
  const session = await open(adapter);

  control.seed([{ at: 1, data: { count: 1 } }]);
  control.script({ outcome: "skip" });

  expect(await session.readback?.()).toEqual({
    status: "read",
    entries: [{ at: 1, data: { count: 1 } }],
  });
});

test("a readback that throws throws its own error, now or when a held call is finished", async () => {
  const { adapter, control } = createMockAdapter(counter);
  const session = await open(adapter);
  const error = new Error("crash");

  control.script({ outcome: "throw", error }, { outcome: "hold" });

  expect(() => session.readback?.()).toThrowError(error);

  const held = session.readback?.();

  control.held()[0]?.throw(new Error("late"));

  await expect(held).rejects.toThrowError("late");
});

test("a held call finished as indeterminate or thrown stores what it carried only when it says so", async () => {
  const { adapter, control } = createMockAdapter(counter);
  const session = await open(adapter);

  control.script({ outcome: "hold" }, { outcome: "hold" });

  const unknown = session.publish({ count: 1 });
  const thrown = session.publish({ count: 2 });

  control.held()[0]?.indeterminate(new Error("maybe"));
  await unknown;

  expect(control.stored()).toEqual([]);

  control.held()[0]?.throw(new Error("crash"), true);
  await expect(thrown).rejects.toThrowError("crash");

  expect(control.stored()).toEqual([{ at: 0, data: { count: 2 } }]);
});

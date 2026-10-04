import { expect, test } from "vitest";
import { settle } from "src/mock/settle";
import { createStreakFrame, ready } from "src/utils/Frame.fixture";

test("a data listener that publishes settles both requests, and the newer one is sent last", async () => {
  const { widget, control } = createStreakFrame();
  let inner: ReturnType<typeof widget.publish> | null = null;

  widget.subscribe(() => {
    const data = widget.get();

    if (inner !== null || data?.state !== "ready" || data.days !== 1) {
      return;
    }

    inner = widget.publish(ready(2));
  });

  const outer = widget.publish(ready(1));

  await settle();

  expect((await outer).status).toBe("superseded");
  expect(await inner).toMatchObject({ status: "submitted", revision: 2 });
  expect(
    control.calls().map((call) => call.operation === "publish" && call.data),
  ).toEqual([ready(2)]);
  expect(widget.status.get().work).toBe("idle");
});

test("a status listener that publishes settles both requests, and the newer one is sent last", async () => {
  const { widget, control } = createStreakFrame();
  let inner: ReturnType<typeof widget.publish> | null = null;

  widget.status.subscribe(() => {
    if (inner !== null || widget.status.get().desired.state !== "accepted") {
      return;
    }

    inner = widget.publish(ready(2));
  });

  const outer = widget.publish(ready(1));

  await settle();

  expect((await outer).status).toBe("superseded");
  expect(await inner).toMatchObject({ status: "submitted" });
  expect(
    control.calls().map((call) => call.operation === "publish" && call.data),
  ).toEqual([ready(2)]);
});

test("a diagnostics listener that publishes cannot corrupt the request it heard about", async () => {
  const { frame, widget, control } = createStreakFrame();
  let inner: ReturnType<typeof widget.publish> | null = null;

  frame.diagnostics.events.subscribe((event) => {
    if (inner !== null || event.type !== "request-accepted") {
      return;
    }

    inner = widget.publish(ready(2));
  });

  const outer = widget.publish(ready(1));

  await settle();

  expect((await outer).status).toBe("superseded");
  expect(await inner).toMatchObject({ status: "submitted", revision: 2 });
  expect(
    control.calls().map((call) => call.operation === "publish" && call.data),
  ).toEqual([ready(2)]);
});

test("a listener that resets while a publication is accepted leaves the fallback to be sent last", async () => {
  const { widget, control } = createStreakFrame();

  widget.subscribe(() => {
    if (widget.get()?.state !== "ready") {
      return;
    }

    widget.reset();
  });

  const outer = widget.publish(ready(1));

  await settle();

  expect((await outer).status).toBe("superseded");
  expect(widget.get()).toEqual({ state: "empty" });
  expect(
    control.calls().map((call) => call.operation === "publish" && call.data),
  ).toEqual([{ state: "empty" }]);
});

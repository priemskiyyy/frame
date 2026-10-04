import { expect, test } from "vitest";
import { createTestClock } from "src/mock/createTestClock";
import type { DiagnosticEventInput } from "src/types/internal/DiagnosticEventInput";
import type { FrameDiagnosticEvent } from "src/types/FrameDiagnosticEvent";
import { Diagnostics } from "src/utils/internal/diagnostics/Diagnostics";

const createDiagnostics = () => {
  let builds = 0;

  const diagnostics = new Diagnostics<never>({
    clock: createTestClock({ now: 50 }),
    getSnapshot: () => {
      builds += 1;

      return { state: "active", epoch: builds, widgets: {} };
    },
  });

  return { diagnostics, getBuilds: () => builds };
};

test("an event is built only while someone listens, and once for however many do", () => {
  const { diagnostics } = createDiagnostics();
  let builds = 0;

  const build = (): DiagnosticEventInput => {
    builds += 1;

    return { type: "frame-disposed" };
  };

  diagnostics.emit(build);

  expect(builds).toBe(0);

  const stopFirst = diagnostics.view.events.subscribe(() => {});
  const stopSecond = diagnostics.view.events.subscribe(() => {});

  diagnostics.emit(build);

  expect(builds).toBe(1);

  stopFirst();
  stopSecond();
  diagnostics.emit(build);

  expect(builds).toBe(1);
});

test("an event is stamped with the clock and frozen with everything nested in it", () => {
  const { diagnostics } = createDiagnostics();
  const events: FrameDiagnosticEvent[] = [];

  diagnostics.view.events.subscribe((event) => events.push(event));
  diagnostics.emit(() => ({
    type: "request-settled",
    widget: { key: "streak" },
    request: { id: "r1" },
    outcome: { status: "submitted" },
  }));

  const [event] = events;

  expect(events).toEqual([
    {
      timestamp: 50,
      type: "request-settled",
      widget: { key: "streak" },
      request: { id: "r1" },
      outcome: { status: "submitted" },
    },
  ]);
  expect(Object.isFrozen(event)).toBe(true);
  expect(
    event?.type === "request-settled" &&
      [event.widget, event.request, event.outcome].every((nested) =>
        Object.isFrozen(nested),
      ),
  ).toBe(true);
});

test("the snapshot is built on the first read and again only after it was invalidated", () => {
  const { diagnostics, getBuilds } = createDiagnostics();
  const first = diagnostics.view.get();

  expect(diagnostics.view.get()).toBe(first);
  expect(getBuilds()).toBe(1);

  diagnostics.invalidate();

  expect(diagnostics.view.get()).not.toBe(first);
  expect(getBuilds()).toBe(2);
});

test("invalidating tells every subscriber, and dropping tells none", () => {
  const { diagnostics } = createDiagnostics();
  let heard = 0;

  diagnostics.view.subscribe(() => {
    heard += 1;
  });
  diagnostics.drop();

  expect(heard).toBe(0);

  diagnostics.invalidate();

  expect(heard).toBe(1);
});

test("dropping forgets the snapshot without telling anyone", () => {
  const { diagnostics, getBuilds } = createDiagnostics();

  diagnostics.view.get();
  diagnostics.drop();
  diagnostics.view.get();

  expect(getBuilds()).toBe(2);
});

test("a subscriber that unsubscribed hears no invalidation", () => {
  const { diagnostics } = createDiagnostics();
  let heard = 0;

  const stop = diagnostics.view.subscribe(() => {
    heard += 1;
  });

  stop();
  diagnostics.invalidate();

  expect(heard).toBe(0);
});

test("the published snapshot is frozen", () => {
  const { diagnostics } = createDiagnostics();

  expect(Object.isFrozen(diagnostics.view.get())).toBe(true);
});

test("the view and its events are frozen, so nobody can swap what they call", () => {
  const { diagnostics } = createDiagnostics();

  expect(Object.isFrozen(diagnostics.view)).toBe(true);
  expect(Object.isFrozen(diagnostics.view.events)).toBe(true);
});

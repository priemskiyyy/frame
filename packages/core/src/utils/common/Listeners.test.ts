import { expect, test } from "vitest";
import { Listeners } from "src/utils/common/Listeners";
import { captureRethrown } from "src/utils/common/captureRethrown.fixture";

const createListeners = () => {
  const listeners = new Listeners<(label: string) => void>();
  const heard: string[] = [];

  const add = (name: string) =>
    listeners.add((label) => heard.push(`${name}:${label}`));

  const notify = (label: string) =>
    listeners.notify((listener) => listener(label));

  return { listeners, heard, add, notify };
};

test("every listener is called with what the caller hands it, in the order added", () => {
  const { heard, add, notify } = createListeners();

  add("first");
  add("second");
  notify("now");

  expect(heard).toEqual(["first:now", "second:now"]);
});

test("a listener that unsubscribed is no longer called", () => {
  const { heard, add, notify } = createListeners();
  const stop = add("only");

  stop();
  notify("now");

  expect(heard).toEqual([]);
});

test("a listener removed during a notification is not called by it", () => {
  const { listeners, heard, add, notify } = createListeners();

  let stopSecond = () => {};

  listeners.add(() => {
    heard.push("first");
    stopSecond();
  });
  stopSecond = add("second");
  notify("now");

  expect(heard).toEqual(["first"]);
});

test("a listener added during a notification waits for the next one", () => {
  const { listeners, heard, add, notify } = createListeners();
  let added = false;

  listeners.add(() => {
    if (added) {
      return;
    }

    added = true;
    add("late");
  });
  notify("first");

  expect(heard).toEqual([]);

  notify("second");

  expect(heard).toEqual(["late:second"]);
});

test("one listener added twice is two subscriptions, and each one stops on its own", () => {
  const { listeners, notify } = createListeners();
  let heard = 0;

  const listener = () => {
    heard += 1;
  };

  const stopFirst = listeners.add(listener);

  listeners.add(listener);
  notify("both");

  expect(heard).toBe(2);

  stopFirst();
  notify("one");

  expect(heard).toBe(3);
});

test("a notification stops when the caller says it is no longer current", () => {
  const { listeners, heard, add } = createListeners();
  let current = true;

  listeners.add(() => {
    current = false;
  });
  add("second");
  listeners.notify(
    (listener) => listener("now"),
    () => current,
  );

  expect(heard).toEqual([]);
});

test("a listener that throws stops no other, and its error is rethrown", () => {
  const { listeners, heard, add, notify } = createListeners();
  const rethrown = captureRethrown();

  listeners.add(() => {
    throw new Error("listener failed");
  });
  add("second");
  notify("now");

  expect(heard).toEqual(["second:now"]);
  expect(rethrown()).toEqual([new Error("listener failed")]);
});

test("it is empty until a listener is added, and again once the last one stops", () => {
  const { listeners } = createListeners();

  expect(listeners.isEmpty()).toBe(true);

  const stop = listeners.add(() => {});

  expect(listeners.isEmpty()).toBe(false);

  stop();

  expect(listeners.isEmpty()).toBe(true);
});

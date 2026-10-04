import { expect, test } from "vitest";
import { ValueStore } from "src/utils/common/ValueStore";

test("a value that is equal to the held one announces nothing", () => {
  const store = new ValueStore(1);

  expect(store.assign(1)).toBeNull();
  expect(store.get()).toBe(1);
});

test("a new value is readable at once and announced only when the caller says so", () => {
  const store = new ValueStore(1);
  const seen: number[] = [];

  store.subscribe(() => seen.push(store.get()));

  const announce = store.assign(2);

  expect(store.get()).toBe(2);
  expect(seen).toEqual([]);

  announce?.();

  expect(seen).toEqual([2]);
});

test("a listener that unsubscribed hears nothing more", () => {
  const store = new ValueStore(1);
  let heard = 0;

  const stop = store.subscribe(() => {
    heard += 1;
  });

  stop();
  store.assign(2)?.();

  expect(heard).toBe(0);
});

test("a value set inside a listener ends the announcement it interrupted", () => {
  const store = new ValueStore(0);
  const seen: number[] = [];
  let interrupted = false;

  store.subscribe(() => {
    if (interrupted) {
      return;
    }

    interrupted = true;
    store.assign(2)?.();
  });
  store.subscribe(() => seen.push(store.get()));
  store.assign(1)?.();

  expect(seen).toEqual([2]);
});

test("the observable reads and subscribes and offers no way to set", () => {
  const store = new ValueStore(1);

  expect(Object.isFrozen(store.observable)).toBe(true);
  expect(Object.keys(store.observable)).toEqual(["get", "subscribe"]);
});

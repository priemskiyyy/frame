import fc from "fast-check";
import { expect, test } from "vitest";
import type { JsonRecord } from "src/types/JsonRecord";
import { DEFAULT_LIMITS } from "src/utils/constants/limits";
import { captureSnapshot } from "src/utils/internal/transport/captureSnapshot";

const capture = (value: JsonRecord, limits = DEFAULT_LIMITS) =>
  captureSnapshot(value, limits);

test("a record is written with sorted keys and no whitespace", () => {
  expect(capture({ b: 1, a: [true, null, "x"], c: { z: 1, y: 2 } })).toEqual({
    status: "captured",
    canonical: '{"a":[true,null,"x"],"b":1,"c":{"y":2,"z":1}}',
  });
});

test("two records with the same content have the same canonical text, whatever their key order", () => {
  const first = capture({ one: 1, two: 2 });
  const second = capture({ two: 2, one: 1 });

  expect(first).toEqual(second);
});

test("negative zero is written as zero", () => {
  expect(capture({ days: -0 })).toEqual({
    status: "captured",
    canonical: '{"days":0}',
  });
});

test("an undefined field is absent, as it is in JSON", () => {
  expect(capture({ label: undefined, days: 1 })).toEqual({
    status: "captured",
    canonical: '{"days":1}',
  });
});

test("a null prototype record is plain data", () => {
  const record: JsonRecord = Object.create(null);

  record.days = 3;

  expect(capture(record)).toEqual({
    status: "captured",
    canonical: '{"days":3}',
  });
});

test("a __proto__ key is data, and does not change a prototype", () => {
  const record: JsonRecord = JSON.parse('{"__proto__":{"polluted":true}}');

  expect(capture(record)).toEqual({
    status: "captured",
    canonical: '{"__proto__":{"polluted":true}}',
  });
  expect(Object.hasOwn({}, "polluted")).toBe(false);
});

test("a number that is not finite is not transportable, and the issue says where", () => {
  expect(capture({ nested: { days: Number.NaN } })).toEqual({
    status: "rejected",
    reason: "not-transportable",
    issues: [
      {
        path: "nested.days",
        message:
          "A number must be finite: NaN and Infinity cannot be transported.",
      },
    ],
  });
  expect(capture({ days: Number.POSITIVE_INFINITY }).status).toBe("rejected");
});

test("a Date, Map, Set or class instance is not plain data", () => {
  // @ts-expect-error a Date is not a JSON value
  expect(capture({ at: new Date(0) }).status).toBe("rejected");
  // @ts-expect-error a Map is not a JSON value
  expect(capture({ at: new Map() }).status).toBe("rejected");
  // @ts-expect-error a Set is not a JSON value
  expect(capture({ at: new Set() }).status).toBe("rejected");
});

test("a function, symbol or bigint is not transportable", () => {
  // @ts-expect-error a function is not a JSON value
  expect(capture({ run: () => 1 }).status).toBe("rejected");
  // @ts-expect-error a symbol is not a JSON value
  expect(capture({ run: Symbol("x") }).status).toBe("rejected");
  // @ts-expect-error a bigint is not a JSON value
  expect(capture({ run: 1n }).status).toBe("rejected");
});

test("a getter is refused, and is never invoked", () => {
  let invoked = false;

  const record = {
    get days() {
      invoked = true;

      return 1;
    },
  };

  expect(capture(record).status).toBe("rejected");
  expect(invoked).toBe(false);
});

test("a toJSON method is not called", () => {
  let invoked = false;

  const record = {
    days: 1,
    toJSON: () => {
      invoked = true;

      return {};
    },
  };

  // @ts-expect-error a function is not a JSON value
  expect(capture(record).status).toBe("rejected");
  expect(invoked).toBe(false);
});

test("a cycle is refused, a shared reference is not", () => {
  const cycle: JsonRecord = { days: 1 };

  cycle.self = cycle;

  const shared = { value: 1 };

  expect(capture(cycle)).toMatchObject({
    status: "rejected",
    reason: "not-transportable",
  });
  expect(capture({ one: shared, two: shared })).toEqual({
    status: "captured",
    canonical: '{"one":{"value":1},"two":{"value":1}}',
  });
});

test("a sparse array, an undefined item and an array with an extra property are refused", () => {
  const extra: string[] = ["a"];

  Object.assign(extra, { note: "b" });

  const sparse: number[] = [];

  sparse[1] = 1;

  expect(capture({ list: sparse }).status).toBe("rejected");
  // @ts-expect-error undefined is not an array item of JSON
  expect(capture({ list: [undefined] }).status).toBe("rejected");
  expect(capture({ list: extra }).status).toBe("rejected");
});

test("the top level must be a record", () => {
  // @ts-expect-error an array is not a record
  expect(capture([]).status).toBe("rejected");
  // @ts-expect-error null is not a record
  expect(capture(null).status).toBe("rejected");
});

test("depth, node and byte limits refuse with limit-exceeded", () => {
  const deep = { a: { b: { c: {} } } };

  expect(capture(deep, { ...DEFAULT_LIMITS, depth: 3 })).toMatchObject({
    status: "rejected",
    reason: "limit-exceeded",
  });
  expect(capture(deep, { ...DEFAULT_LIMITS, depth: 4 }).status).toBe(
    "captured",
  );
  expect(
    capture({ list: [1, 2, 3, 4] }, { ...DEFAULT_LIMITS, nodes: 4 }),
  ).toMatchObject({ status: "rejected", reason: "limit-exceeded" });
  expect(
    capture({ text: "x".repeat(40) }, { ...DEFAULT_LIMITS, bytes: 30 }),
  ).toMatchObject({ status: "rejected", reason: "limit-exceeded" });
});

test("a value with exactly the depth, node or byte limit is captured", () => {
  expect(
    capture({ a: { b: {} } }, { ...DEFAULT_LIMITS, depth: 3 }).status,
  ).toBe("captured");
  expect(
    capture({ list: [1, 2, 3] }, { ...DEFAULT_LIMITS, nodes: 4 }).status,
  ).toBe("captured");
  expect(capture({ s: "xx" }, { ...DEFAULT_LIMITS, bytes: 10 }).status).toBe(
    "captured",
  );
  expect(capture({ s: "xxx" }, { ...DEFAULT_LIMITS, bytes: 10 }).status).toBe(
    "rejected",
  );
});

test("the issue of a limit names where the walk stopped, and says which limit", () => {
  expect(
    capture({ a: { b: { c: {} } } }, { ...DEFAULT_LIMITS, depth: 3 }),
  ).toEqual({
    status: "rejected",
    reason: "limit-exceeded",
    issues: [
      { path: "a.b.c", message: "The value is nested deeper than 3 levels." },
    ],
  });
  expect(
    capture({ list: [1, 2, 3, 4] }, { ...DEFAULT_LIMITS, nodes: 4 }),
  ).toMatchObject({
    issues: [{ path: "list[3]", message: "The value has more than 4 values." }],
  });
  expect(
    capture({ text: "x".repeat(100) }, { ...DEFAULT_LIMITS, bytes: 30 }),
  ).toMatchObject({
    issues: [{ path: "text", message: "The value is larger than 30 bytes." }],
  });
  expect(
    capture({ [`k${"k".repeat(39)}`]: 1 }, { ...DEFAULT_LIMITS, bytes: 30 }),
  ).toMatchObject({
    issues: [
      {
        path: `k${"k".repeat(39)}`,
        message: "The value is larger than 30 bytes.",
      },
    ],
  });
});

test("the byte limit counts UTF-8 bytes of the canonical text", () => {
  const limits = { ...DEFAULT_LIMITS, bytes: 16 };

  expect(capture({ t: "😀😀" }, limits).status).toBe("captured");
  expect(capture({ t: "😀😀😀" }, limits).status).toBe("rejected");
});

test("an issue after a good array item or a skipped undefined field is named by its own place", () => {
  expect(capture({ list: [1, Number.NaN] })).toMatchObject({
    issues: [{ path: "list[1]" }],
  });
  expect(capture({ a: undefined, b: Number.NaN })).toMatchObject({
    issues: [{ path: "b" }],
  });
});

test("a cycle through an array is refused by name, not by overflowing the stack", () => {
  const list: JsonRecord[] = [];

  list.push({ list });

  expect(capture({ list })).toEqual({
    status: "rejected",
    reason: "not-transportable",
    issues: [{ path: "list[0].list", message: "The value contains a cycle." }],
  });
});

test("a getter on an array index is refused, and is never invoked", () => {
  let invoked = false;
  const list: number[] = [1];

  Object.defineProperty(list, 0, {
    enumerable: true,
    get: () => {
      invoked = true;

      return 1;
    },
  });

  expect(capture({ list })).toEqual({
    status: "rejected",
    reason: "not-transportable",
    issues: [
      {
        path: "list[0]",
        message:
          "A property must be plain data: a getter or setter cannot be transported.",
      },
    ],
  });
  expect(invoked).toBe(false);
});

test("each refusal of a value that is not data says why", () => {
  // @ts-expect-error an array is not a record
  expect(capture([])).toEqual({
    status: "rejected",
    reason: "not-transportable",
    issues: [
      { path: "", message: "The top-level value must be a plain record." },
    ],
  });
  // @ts-expect-error a function is not a JSON value
  expect(capture({ run: () => 1 })).toMatchObject({
    issues: [
      {
        path: "run",
        message:
          "A function, symbol, bigint or undefined cannot be transported.",
      },
    ],
  });
  // @ts-expect-error undefined is not an array item of JSON
  expect(capture({ list: [undefined] })).toMatchObject({
    issues: [
      { path: "list[0]", message: "An array item cannot be undefined." },
    ],
  });
  expect(capture({ list: [] })).toMatchObject({ status: "captured" });
});

test("a value that throws when it is read cannot travel, and says so", () => {
  const { proxy, revoke } = Proxy.revocable({}, {});

  revoke();

  expect(capture({ inner: proxy })).toMatchObject({
    status: "rejected",
    reason: "not-transportable",
    issues: [
      {
        path: "",
        message: expect.stringMatching(/^The value could not be read: /),
      },
    ],
  });
});

test("capturing never mutates the value it reads", () => {
  const value = { b: [1, { z: 1, a: 2 }], a: "x" };
  const before = JSON.stringify(value);

  capture(value);

  expect(JSON.stringify(value)).toBe(before);
});

const jsonValue = fc.jsonValue();

test("the canonical text of any JSON record parses back to an equal record", () => {
  fc.assert(
    fc.property(fc.dictionary(fc.string(), jsonValue), (record) => {
      const captured = capture(record);

      if (captured.status === "rejected") {
        return;
      }

      expect(JSON.parse(captured.canonical)).toEqual(
        JSON.parse(JSON.stringify(record)),
      );
    }),
  );
});

test("the canonical text does not depend on key insertion order", () => {
  fc.assert(
    fc.property(fc.dictionary(fc.string(), fc.integer()), (record) => {
      const reversed = Object.fromEntries(Object.entries(record).reverse());

      expect(capture(reversed)).toEqual(capture(record));
    }),
  );
});

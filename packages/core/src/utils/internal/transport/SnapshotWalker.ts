import type { Capture } from "src/types/internal/Capture";
import type { Rejection } from "src/types/internal/Rejection";
import type { FrameLimits } from "src/types/FrameLimits";
import type { InvalidReason } from "src/types/InvalidReason";
import type { JsonRecord } from "src/types/JsonRecord";
import type { JsonValue } from "src/types/JsonValue";
import { formatPath } from "src/utils/internal/transport/formatPath";
import { getUtf8Length } from "src/utils/internal/transport/getUtf8Length";

type Walked = { status: "walked"; text: string } | Rejection;

/** One walk of one value, reading own data properties through their descriptors so no getter, toJSON or prototype method of the caller runs. */
export class SnapshotWalker {
  #limits: Pick<FrameLimits, "depth" | "nodes" | "bytes">;
  #path: (string | number)[] = [];
  #ancestors = new Set<object>();
  #nodes = 0;
  #bytes = 0;

  constructor(limits: Pick<FrameLimits, "depth" | "nodes" | "bytes">) {
    this.#limits = limits;
  }

  capture = (value: JsonRecord): Capture => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return this.#reject(
        "not-transportable",
        "The top-level value must be a plain record.",
      );
    }

    const walked = this.#walkRecord(value, 1);

    if (walked.status === "rejected") {
      return walked;
    }

    if (getUtf8Length(walked.text) > this.#limits.bytes) {
      return this.#reject(
        "limit-exceeded",
        `The value is larger than ${this.#limits.bytes} bytes.`,
      );
    }

    return { status: "captured", canonical: walked.text };
  };

  #reject = (reason: InvalidReason, message: string): Rejection => ({
    status: "rejected",
    reason,
    issues: [{ path: formatPath(this.#path), message }],
  });

  // Counted before serializing, so one huge string stops the walk instead of being copied first.
  #spend = (size: number) => {
    this.#bytes += size;

    return this.#bytes <= this.#limits.bytes;
  };

  #walk = (node: JsonValue, depth: number): Walked => {
    this.#nodes += 1;

    if (this.#nodes > this.#limits.nodes) {
      return this.#reject(
        "limit-exceeded",
        `The value has more than ${this.#limits.nodes} values.`,
      );
    }

    if (node === null) {
      return { status: "walked", text: "null" };
    }

    if (typeof node === "string") {
      return this.#walkString(node);
    }

    if (typeof node === "boolean") {
      return { status: "walked", text: JSON.stringify(node) };
    }

    if (typeof node === "number") {
      return this.#walkNumber(node);
    }

    if (typeof node !== "object") {
      return this.#reject(
        "not-transportable",
        "A function, symbol, bigint or undefined cannot be transported.",
      );
    }

    if (Array.isArray(node)) {
      return this.#walkArray(node, depth);
    }

    return this.#walkRecord(node, depth);
  };

  #walkString = (node: string): Walked => {
    if (!this.#spend(node.length)) {
      return this.#reject(
        "limit-exceeded",
        `The value is larger than ${this.#limits.bytes} bytes.`,
      );
    }

    return { status: "walked", text: JSON.stringify(node) };
  };

  #walkNumber = (node: number): Walked => {
    if (!Number.isFinite(node)) {
      return this.#reject(
        "not-transportable",
        "A number must be finite: NaN and Infinity cannot be transported.",
      );
    }

    // JSON.stringify writes -0 as 0, which is the canonical form.
    return { status: "walked", text: JSON.stringify(node) };
  };

  #enter = (node: JsonValue[] | JsonRecord, depth: number) => {
    if (depth > this.#limits.depth) {
      return this.#reject(
        "limit-exceeded",
        `The value is nested deeper than ${this.#limits.depth} levels.`,
      );
    }

    if (this.#ancestors.has(node)) {
      return this.#reject("not-transportable", "The value contains a cycle.");
    }

    this.#ancestors.add(node);

    return null;
  };

  #walkArray = (node: JsonValue[], depth: number): Walked => {
    const rejection = this.#enter(node, depth);

    if (rejection !== null) {
      return rejection;
    }

    // A hole or an extra property makes the own keys differ from the length.
    if (Object.keys(node).length !== node.length) {
      return this.#reject(
        "not-transportable",
        "An array must be dense and carry no properties besides its items.",
      );
    }

    const parts: string[] = [];

    for (let index = 0; index < node.length; index += 1) {
      this.#path.push(index);

      const item = this.#readProperty(node, index);

      if (item.status === "rejected") {
        return item;
      }

      if (item.value === undefined) {
        return this.#reject(
          "not-transportable",
          "An array item cannot be undefined.",
        );
      }

      const walked = this.#walk(item.value, depth + 1);

      if (walked.status === "rejected") {
        return walked;
      }

      parts.push(walked.text);
      this.#path.pop();
    }

    this.#ancestors.delete(node);

    return { status: "walked", text: `[${parts.join(",")}]` };
  };

  #walkRecord = (node: JsonRecord, depth: number): Walked => {
    const rejection = this.#enter(node, depth);

    if (rejection !== null) {
      return rejection;
    }

    const prototype = Object.getPrototypeOf(node);

    if (prototype !== Object.prototype && prototype !== null) {
      return this.#reject(
        "not-transportable",
        "A record must be plain data: a class instance, Date, Map or Set cannot be transported.",
      );
    }

    const parts: string[] = [];

    for (const key of Object.keys(node).sort()) {
      this.#path.push(key);

      const property = this.#readProperty(node, key);

      if (property.status === "rejected") {
        return property;
      }

      // An absent field and an undefined one are the same thing in JSON.
      if (property.value === undefined) {
        this.#path.pop();
        continue;
      }

      if (!this.#spend(key.length)) {
        return this.#reject(
          "limit-exceeded",
          `The value is larger than ${this.#limits.bytes} bytes.`,
        );
      }

      const walked = this.#walk(property.value, depth + 1);

      if (walked.status === "rejected") {
        return walked;
      }

      parts.push(`${JSON.stringify(key)}:${walked.text}`);
      this.#path.pop();
    }

    this.#ancestors.delete(node);

    return { status: "walked", text: `{${parts.join(",")}}` };
  };

  #readProperty = (
    node: JsonValue[] | JsonRecord,
    key: string | number,
  ): { status: "read"; value: JsonValue | undefined } | Rejection => {
    const descriptor = Object.getOwnPropertyDescriptor(node, key);

    if (descriptor === undefined || !("value" in descriptor)) {
      return this.#reject(
        "not-transportable",
        "A property must be plain data: a getter or setter cannot be transported.",
      );
    }

    // Object.getOwnPropertyDescriptor answers any, and the walk checks what it reads.
    const value: JsonValue | undefined = descriptor.value;

    return { status: "read", value };
  };
}

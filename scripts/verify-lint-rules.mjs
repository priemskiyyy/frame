// Lints probes with the real ESLint config. Every rule is proven in both
// directions: a probe it must reject, and where the rule has an exception, a
// probe it must allow. A rule, global or import restriction that no probe
// reaches fails the run, so a rule cannot be added or silently dropped by a
// later config block without this script noticing. A selector is proven by its
// selector, not by its message, and every alternative inside it (a comma list,
// a :matches() group, a regex alternation, :function) needs a probe only that
// alternative accepts, so deleting one turns a probe red.
import { ESLint } from "eslint";

const eslint = new ESLint();

const files = {
  shipped: "packages/core/src/utils/probe.ts",
  entry: "packages/core/src/index.ts",
  conformance: "packages/core/src/testing/probe.ts",
  test: "packages/core/src/utils/probe.test.ts",
  fixture: "packages/core/src/utils/probe.fixture.ts",
  contract: "packages/core/src/utils/probe.contracts.ts",
  react: "packages/react/src/hooks/probe.ts",
  reactEntry: "packages/react/src/index.ts",
  reactTest: "packages/react/src/hooks/probe.test.ts",
  adapter: "packages/adapters/expo/src/utils/probe.ts",
  adapterEntry: "packages/adapters/expo/src/index.ts",
  adapterTest: "packages/adapters/expo/src/probe.test.ts",
  adapterFixture: "packages/adapters/expo/src/probe.fixture.ts",
  providerMirror:
    "packages/adapters/expo/src/types/ExpoWidgetEnvironmentLike.ts",
  clock: "packages/core/src/utils/internal/clock/createSystemClock.ts",
  overload: "packages/core/src/utils/widget.ts",
  constants: "packages/core/src/utils/constants/probe.ts",
  register: "packages/react/src/types/Register.ts",
  reactTypes: "packages/react/src/types/Other.ts",
  exampleRegister: "examples/expo/src/frames/Register.ts",
  example: "examples/expo/src/probe.tsx",
  exampleTest: "examples/expo/src/probe.test.ts",
  exampleEntry: "examples/expo/probe.tsx",
  exampleConstants: "examples/expo/src/utils/constants/probe.ts",
  script: "scripts/probe.mjs",
};

const conversions = ["Number", "String", "Boolean", "BigInt", "Object"];

const conversionMessages = {
  Number: "Do not convert with Number()",
  String: "Do not convert with String()",
  Boolean: "Do not convert with Boolean()",
  BigInt: "Do not convert with BigInt() or Object()",
  Object: "Do not convert with BigInt() or Object()",
};

const guarded = "if (flag) {\n      flag.toString();\n    }";

// [name, file, code, rule, a fragment of the message that names the alternative]
const rejected = [
  [
    "any",
    files.shipped,
    "export type Bad = any;",
    "@typescript-eslint/no-explicit-any",
    "",
  ],
  [
    "unknown",
    files.shipped,
    "export type Bad = unknown;",
    "no-restricted-syntax",
    "Name the contract instead of unknown",
  ],
  [
    "as",
    files.shipped,
    "export const bad = 1 as number;",
    "no-restricted-syntax",
    "Do not use type assertions, including as const",
  ],
  [
    "as const",
    files.shipped,
    "export const bad = [1] as const;",
    "no-restricted-syntax",
    "Do not use type assertions, including as const",
  ],
  [
    "angle-bracket assertion",
    files.shipped,
    "export const bad = <number>1;",
    "no-restricted-syntax",
    "Do not use type assertions. Narrow",
  ],
  [
    "non-null assertion",
    files.shipped,
    "export const bad = (value?: string) => value!;",
    "no-restricted-syntax",
    "Narrow nullable values",
  ],
  [
    "enum",
    files.shipped,
    "export enum Bad { Value }",
    "no-restricted-syntax",
    "string union instead of an enum",
  ],
  [
    "switch",
    files.shipped,
    "export const bad = (value: number) => { switch (value) { default: return 1; } };",
    "no-restricted-syntax",
    "explicit conditional dispatch",
  ],
  [
    "void operator",
    files.shipped,
    "export const bad = () => { void Promise.resolve(); };",
    "no-restricted-syntax",
    "Handle promise completion",
  ],
  [
    "nullish assignment",
    files.shipped,
    "export const bad = (value?: number) => { value ??= 1; return value; };",
    "no-restricted-syntax",
    "Use explicit assignment",
  ],
  [
    "logical or assignment",
    files.shipped,
    "export const bad = (value: number) => { value ||= 1; return value; };",
    "no-restricted-syntax",
    "Use explicit assignment",
  ],
  [
    "logical and assignment",
    files.shipped,
    "export const bad = (value: number) => { value &&= 1; return value; };",
    "no-restricted-syntax",
    "Use explicit assignment",
  ],
  [
    "readonly member",
    files.shipped,
    "export type Bad = { readonly id: string };",
    "no-restricted-syntax",
    "Use mutable public property types",
  ],
  [
    "readonly index signature",
    files.shipped,
    "export type Bad = { readonly [key: string]: string };",
    "no-restricted-syntax",
    "Use mutable index signatures",
  ],
  [
    "readonly class field",
    files.shipped,
    "export class Bad { readonly id = 1; }",
    "no-restricted-syntax",
    "Use mutable property types",
  ],
  [
    "readonly parameter property",
    files.shipped,
    "export class Bad { constructor(readonly id: number) {} }",
    "no-restricted-syntax",
    "Use mutable property types",
  ],
  [
    "readonly mapped modifier",
    files.shipped,
    "export type Bad = { readonly [Key in 'a']: string };",
    "no-restricted-syntax",
    "Do not add readonly mapped modifiers",
  ],
  [
    "readonly array",
    files.shipped,
    "export type Bad = readonly string[];",
    "no-restricted-syntax",
    "Use mutable array types",
  ],
  ...[
    "Readonly",
    "ReadonlyArray",
    "ReadonlyMap",
    "ReadonlySet",
    "DeepReadonly",
  ].map((name) => [
    `${name} helper`,
    files.shipped,
    `export type Bad = ${name}<string>;`,
    "no-restricted-syntax",
    "Do not use readonly utility types",
  ]),
  [
    "export all",
    files.shipped,
    'export * from "src/thing";',
    "no-restricted-syntax",
    "List public exports explicitly",
  ],
  [
    "filter then map",
    files.shipped,
    "export const bad = (values: number[]) => values.filter((value) => value > 0).map((value) => value + 1);",
    "no-restricted-syntax",
    "Use one .flatMap()",
  ],
  [
    "map then filter",
    files.shipped,
    "export const bad = (values: number[]) => values.map((value) => value + 1).filter((value) => value > 0);",
    "no-restricted-syntax",
    "Use one .flatMap()",
  ],
  [
    "returned ternary",
    files.shipped,
    "export const bad = (value: boolean) => { return value ? 1 : 0; };",
    "no-restricted-syntax",
    "Return early from an if",
  ],
  [
    "arrow ternary body",
    files.shipped,
    "export const bad = (value: boolean) => value ? 1 : 0;",
    "no-restricted-syntax",
    "Give the arrow a block",
  ],
  [
    "an arrow function ending in an if",
    files.shipped,
    "export const bad = (flag: boolean) => {\n  if (flag) {\n    flag.toString();\n  }\n};",
    "no-restricted-syntax",
    "Guard, then work: write `if (!condition) { return; }` and do the work after it, instead of ending a function",
  ],
  [
    "a function declaration ending in an if",
    files.shipped,
    "function bad(flag: boolean) {\n  if (flag) {\n    flag.toString();\n  }\n}\n\nexport const ok = bad;",
    "no-restricted-syntax",
    "Guard, then work: write `if (!condition) { return; }` and do the work after it, instead of ending a function",
  ],
  [
    "a function expression ending in an if",
    files.shipped,
    "export const bad = function (flag: boolean) {\n  if (flag) {\n    flag.toString();\n  }\n};",
    "no-restricted-syntax",
    "Guard, then work: write `if (!condition) { return; }` and do the work after it, instead of ending a function",
  ],
  ...[
    [
      "a for loop",
      `for (let index = 0; index < 1; index += 1) {\n    ${guarded}\n  }`,
    ],
    ["a for-of loop", `for (const value of [flag]) {\n    ${guarded}\n  }`],
    ["a for-in loop", `for (const key in { flag }) {\n    ${guarded}\n  }`],
    ["a while loop", `while (flag) {\n    ${guarded}\n  }`],
    ["a do-while loop", `do {\n    ${guarded}\n  } while (flag);`],
  ].map(([name, loop]) => [
    `${name} ending in an if`,
    files.shipped,
    `export const bad = (flag: boolean) => {\n  ${loop}\n};`,
    "no-restricted-syntax",
    "Guard, then work: write `if (!condition) { continue; }`",
  ]),
  [
    "a try block ending in an if",
    files.shipped,
    "export const bad = (flag: boolean) => {\n  try {\n    flag.toString();\n\n    if (flag) {\n      flag.toString();\n    }\n  } finally {\n    flag.toString();\n  }\n};",
    "no-restricted-syntax",
    "instead of ending a try, catch or finally block",
  ],
  [
    "a catch block ending in an if",
    files.shipped,
    "export const bad = (flag: boolean) => {\n  try {\n    flag.toString();\n  } catch {\n    flag.toString();\n\n    if (flag) {\n      flag.toString();\n    }\n  }\n};",
    "no-restricted-syntax",
    "instead of ending a try, catch or finally block",
  ],
  [
    "a finally block ending in an if",
    files.shipped,
    "export const bad = (flag: boolean) => {\n  try {\n    flag.toString();\n  } finally {\n    flag.toString();\n\n    if (flag) {\n      flag.toString();\n    }\n  }\n};",
    "no-restricted-syntax",
    "instead of ending a try, catch or finally block",
  ],
  [
    "interface",
    files.shipped,
    "export interface Bad { id: string }",
    "@typescript-eslint/consistent-type-definitions",
    "",
  ],
  [
    "relative import",
    files.shipped,
    'import { thing } from "./thing"; export const bad = thing;',
    "no-restricted-syntax",
    "Use src/... imports or public package imports",
  ],
  [
    "relative re-export",
    files.entry,
    'export { thing } from "./thing";',
    "no-restricted-syntax",
    "Use src/... imports for public exports",
  ],
  [
    "relative dynamic import",
    files.shipped,
    'export const bad = () => import("./thing");',
    "no-restricted-syntax",
    "Use src/... imports for dynamic imports",
  ],
  [
    "relative imported type",
    files.shipped,
    'export type Bad = import("./thing").Thing;',
    "no-restricted-syntax",
    "Use src/... imports for imported types",
  ],
  ...conversions.flatMap((name) => [
    [
      `${name} called`,
      files.shipped,
      `export const bad = (value: string) => ${name}(value);`,
      "no-restricted-syntax",
      conversionMessages[name],
    ],
    [
      `${name} constructed`,
      files.shipped,
      `export const bad = (value: string) => new ${name}(value);`,
      "no-restricted-syntax",
      conversionMessages[name],
    ],
    [
      `${name} as a callback`,
      files.shipped,
      `export const bad = (values: string[]) => values.map(${name});`,
      "no-restricted-syntax",
      "Do not pass a constructor as a conversion callback",
    ],
  ]),
  [
    "braceless if",
    files.shipped,
    "export const bad = (value: boolean) => { if (value) return 1; return 2; };",
    "curly",
    "",
  ],
  [
    "else after a return",
    files.shipped,
    "export const bad = (value: number) => {\n  if (value > 1) {\n    return 1;\n  } else {\n    return 2;\n  }\n};",
    "no-else-return",
    "",
  ],
  [
    "a missing blank line before a return",
    files.shipped,
    "export const bad = (value: number) => { const next = value + 1; return next; };",
    "padding-line-between-statements",
    "",
  ],
  [
    "a runtime import used as a type",
    files.shipped,
    'import { Thing } from "src/thing"; export const bad: Thing | null = null;',
    "@typescript-eslint/consistent-type-imports",
    "",
  ],
  [
    "an inline disable comment",
    files.shipped,
    "// eslint-disable-next-line no-restricted-syntax\nexport const bad = 1 as number;",
    "no-restricted-syntax",
    "Do not use type assertions",
  ],
  [
    "an interface beside Register",
    files.reactTypes,
    "export interface Bad { id: string }",
    "@typescript-eslint/consistent-type-definitions",
    "",
  ],
  [
    "a default export",
    files.shipped,
    "const bad = 1;\n\nexport default bad;",
    "no-restricted-syntax",
    "Use a named export",
  ],
  [
    "module-level mutable state",
    files.shipped,
    "let count = 0;\n\nexport const bad = () => count;",
    "no-restricted-syntax",
    "No module-level mutable state",
  ],
  [
    "exported module-level mutable state",
    files.shipped,
    "export let bad = 0;",
    "no-restricted-syntax",
    "No module-level mutable state",
  ],
  [
    "two exports in one file",
    files.shipped,
    "export const first = 1;\n\nexport const second = 2;",
    "no-restricted-syntax",
    "Export one thing per file",
  ],
  [
    "a re-export outside an entry point",
    files.shipped,
    'export { thing } from "src/thing";',
    "no-restricted-syntax",
    "Keep explicit re-exports at public package entry points only",
  ],
  [
    "Date.now",
    files.shipped,
    "export const bad = () => Date.now();",
    "no-restricted-syntax",
    "Read the time through the Frame clock",
  ],
  [
    "new Date",
    files.shipped,
    "export const bad = () => new Date();",
    "no-restricted-syntax",
    "Read the time through the Frame clock",
  ],
  [
    "Date called as a function",
    files.shipped,
    "export const bad = () => Date();",
    "no-restricted-syntax",
    "Read the time through the Frame clock",
  ],
  [
    "performance.now",
    files.shipped,
    "export const bad = () => performance.now();",
    "no-restricted-syntax",
    "Read the time through the Frame clock",
  ],
  ...["setTimeout", "clearTimeout", "setInterval", "clearInterval"].map(
    (name) => [
      `a ${name} call`,
      files.shipped,
      `export const bad = () => ${name}(1);`,
      "no-restricted-syntax",
      "Schedule through the Frame clock",
    ],
  ),
  [
    "Math.random",
    files.shipped,
    "export const bad = () => Math.random();",
    "no-restricted-syntax",
    "Frame draws no randomness",
  ],
  ...["abort", "any", "timeout"].map((name) => [
    `AbortSignal.${name}`,
    files.shipped,
    `export const bad = () => AbortSignal.${name}(1);`,
    "no-restricted-syntax",
    "no static abort(), any() or timeout()",
  ]),
  [
    "throwIfAborted",
    files.shipped,
    "export const bad = (signal: { throwIfAborted: () => number }) => signal.throwIfAborted();",
    "no-restricted-syntax",
    "no throwIfAborted()",
  ],
  [
    "signal.reason",
    files.shipped,
    "export const bad = (signal: { reason: number }) => signal.reason;",
    "no-restricted-syntax",
    "AbortSignal has no reason",
  ],
  [
    "options.signal.reason",
    files.shipped,
    "export const bad = (options: { signal: { reason: number } }) => options.signal.reason;",
    "no-restricted-syntax",
    "AbortSignal has no reason",
  ],
  [
    "a structuredClone call",
    files.shipped,
    "export const bad = () => structuredClone({});",
    "no-restricted-syntax",
    "Hermes has no structuredClone",
  ],
  [
    "a structuredClone member",
    files.shipped,
    "export const bad = () => structuredClone.name;",
    "no-restricted-syntax",
    "Hermes has no structuredClone",
  ],
  ...["toSorted", "toReversed", "toSpliced"].map((name) => [
    name,
    files.shipped,
    `export const bad = (values: number[]) => values.${name}();`,
    "no-restricted-syntax",
    "no change-array-by-copy methods",
  ]),
  ...["Object", "Map"].map((name) => [
    `${name}.groupBy`,
    files.shipped,
    `export const bad = () => ${name}.groupBy([1], () => 'a');`,
    "no-restricted-syntax",
    "Hermes has no groupBy",
  ]),
  ...["withResolvers", "try"].map((name) => [
    `Promise.${name}`,
    files.shipped,
    `export const bad = () => Promise.${name}();`,
    "no-restricted-syntax",
    "Promise.withResolvers nor Promise.try",
  ]),
  ...["dispose", "asyncDispose"].map((name) => [
    `Symbol.${name}`,
    files.shipped,
    `export const bad = () => Symbol.${name};`,
    "no-restricted-syntax",
    "Hermes has no Symbol.dispose",
  ]),
  [
    "an async arrow with a destructured parameter",
    files.shipped,
    "export const bad = async ({ id }: { id: number }) => id;",
    "no-restricted-syntax",
    "Hermes V1",
  ],
  [
    "an async arrow with a defaulted parameter",
    files.shipped,
    "export const bad = async (id = 1) => id;",
    "no-restricted-syntax",
    "Hermes V1",
  ],
  [
    "an async arrow with an array parameter",
    files.shipped,
    "export const bad = async ([id]: number[]) => id;",
    "no-restricted-syntax",
    "Hermes V1",
  ],
  [
    "an async arrow with a rest parameter",
    files.shipped,
    "export const bad = async (...ids: number[]) => ids;",
    "no-restricted-syntax",
    "Hermes V1",
  ],
  [
    "a provider SDK at runtime",
    files.shipped,
    'import { widget } from "expo-widgets"; export const bad = widget;',
    "@typescript-eslint/no-restricted-imports",
    "No runtime code imports a provider SDK",
  ],
  [
    "react in the core",
    files.shipped,
    'import { useState } from "react"; export const bad = useState;',
    "@typescript-eslint/no-restricted-imports",
    "No runtime code imports a provider SDK",
  ],
  [
    "a test runner in a package source",
    files.shipped,
    'import { expect } from "vitest"; export const bad = expect;',
    "@typescript-eslint/no-restricted-imports",
    "never imports a test runner",
  ],
  [
    "the core runtime in an adapter's source",
    files.adapter,
    'import type { JsonRecord } from "@priemskiyyy/frame";\n\nexport type Bad = JsonRecord;\n',
    "@typescript-eslint/no-restricted-imports",
    "never the runtime",
  ],
  [
    "a provider SDK in the react package",
    files.react,
    'import { widget } from "expo-widgets"; export const bad = widget;',
    "@typescript-eslint/no-restricted-imports",
    "No runtime code imports a provider SDK",
  ],
  [
    "a second export outside a constants file",
    files.exampleConstants.replace("constants/", ""),
    "export const first = 1;\n\nexport const second = 2;",
    "no-restricted-syntax",
    "Export one thing per file",
  ],
  [
    "a relative import in the example",
    files.example,
    'import { thing } from "./thing"; export const bad = thing;',
    "no-restricted-syntax",
    "Use src/... imports or public package imports",
  ],
  [
    "an async arrow with a destructured parameter in the example",
    files.example,
    "export const bad = async ({ id }: { id: number }) => id;",
    "no-restricted-syntax",
    "Hermes V1",
  ],
  [
    "a type assertion in the example",
    files.example,
    "export const bad = 1 as number;",
    "no-restricted-syntax",
    "Do not use type assertions",
  ],
  [
    "a default export in the example",
    files.example,
    "const bad = 1;\n\nexport default bad;",
    "no-restricted-syntax",
    "Use a named export",
  ],
  [
    "a default export in an example entry",
    files.exampleEntry,
    "const bad = 1;\n\nexport default bad;",
    "no-restricted-syntax",
    "Use a named export",
  ],
  [
    "a Number conversion in a script",
    files.script,
    "export const bad = (text) => Number(text);",
    "no-restricted-syntax",
    "Do not convert with Number()",
  ],
  [
    "a callback conversion in a script",
    files.script,
    "export const bad = (values) => values.map(String);",
    "no-restricted-syntax",
    "Do not pass a constructor as a conversion callback",
  ],
  ...[
    "request",
    "context",
    "session",
    "adapter",
    "operation",
    "snapshot",
    "handle",
    "lane",
  ].map((noun) => [
    `${noun}Id`,
    files.shipped,
    `export const ${noun}Id = 1;`,
    "no-restricted-syntax",
    "write request: { id }, never requestId",
  ]),
  [
    "requestKey",
    files.shipped,
    "export const requestKey = 1;",
    "no-restricted-syntax",
    "write request: { id }, never requestId",
  ],
  [
    "widgetKey",
    files.shipped,
    "export const widgetKey = 1;",
    "no-restricted-syntax",
    "write widget: { key }, never widgetKey",
  ],
  [
    "a private field ending in Id",
    files.shipped,
    "export class Bad {\n  #latestId = 1;\n\n  next = () => this.#latestId;\n}\n",
    "no-restricted-syntax",
    "hold #latest = { id }",
  ],
  [
    "a private field ending in Key",
    files.shipped,
    "export class Bad {\n  #latestKey = 1;\n\n  next = () => this.#latestKey;\n}\n",
    "no-restricted-syntax",
    "hold #latest = { id }",
  ],
  [
    "an identifier suffix in a test",
    files.test,
    "export const requestId = 1;",
    "no-restricted-syntax",
    "write request: { id }, never requestId",
  ],
  [
    "an exported function declaration",
    files.shipped,
    "export function bad() {\n  return 1;\n}\n",
    "no-restricted-syntax",
    "Export an arrow function, one per file",
  ],
  [
    "a class method",
    files.shipped,
    "export class Bad {\n  next() {\n    return 1;\n  }\n}\n",
    "no-restricted-syntax",
    "Write a class member as an arrow field",
  ],
  [
    "a class getter",
    files.shipped,
    "export class Bad {\n  get next() {\n    return 1;\n  }\n}\n",
    "no-restricted-syntax",
    "Write a class member as an arrow field",
  ],
  [
    "a module-level Map",
    files.shipped,
    "const cache = new Map();\n\nexport const bad = cache;\n",
    "no-restricted-syntax",
    "hold a collection in a class field or a closure",
  ],
  [
    "a module-level Set",
    files.shipped,
    "const seen = new Set();\n\nexport const bad = seen;\n",
    "no-restricted-syntax",
    "hold a collection in a class field or a closure",
  ],
  [
    "a module-level WeakMap",
    files.shipped,
    "const owners = new WeakMap();\n\nexport const bad = owners;\n",
    "no-restricted-syntax",
    "hold a collection in a class field or a closure",
  ],
  [
    "a module-level WeakSet",
    files.shipped,
    "const marked = new WeakSet();\n\nexport const bad = marked;\n",
    "no-restricted-syntax",
    "hold a collection in a class field or a closure",
  ],
  [
    "an exported module-level collection",
    files.shipped,
    "export const bad = new Set();\n",
    "no-restricted-syntax",
    "hold a collection in a class field or a closure",
  ],
  [
    "an optional field without undefined",
    files.shipped,
    "export type Bad = { name?: string };\n",
    "no-restricted-syntax",
    "Type an optional field as name?: T | undefined",
  ],
  [
    "code in an entry point",
    files.entry,
    "export const bad = 1;\n",
    "no-restricted-syntax",
    "An entry point only re-exports the public API",
  ],
  [
    "an import in an entry point",
    files.adapterEntry,
    'import type { Thing } from "src/thing";\n\nexport type { Thing };\n',
    "no-restricted-syntax",
    "An entry point only re-exports the public API",
  ],
  ...["describe", "it", "suite"].map((name) => [
    `${name} in a test`,
    files.test,
    `import { ${name} } from "vitest";\n\nexport const bad = ${name};\n`,
    "no-restricted-syntax",
    "Write flat test() calls",
  ]),
  [
    "describe in an adapter's test",
    files.adapterTest,
    'import { describe } from "vitest";\n\nexport const bad = describe;\n',
    "no-restricted-syntax",
    "Write flat test() calls",
  ],
  [
    "describe in the example's test",
    files.exampleTest,
    'import { describe } from "vitest";\n\nexport const bad = describe;\n',
    "no-restricted-syntax",
    "Write flat test() calls",
  ],
  [
    "a default export in a test",
    files.test,
    "const bad = 1;\n\nexport default bad;",
    "no-restricted-syntax",
    "Use a named export",
  ],
  [
    "a default export in a fixture",
    files.fixture,
    "const bad = 1;\n\nexport default bad;",
    "no-restricted-syntax",
    "Use a named export",
  ],
  [
    "a default export in a contract",
    files.contract,
    "const bad = 1;\n\nexport default bad;",
    "no-restricted-syntax",
    "Use a named export",
  ],
  [
    "module-level mutable state in a test",
    files.test,
    "let count = 0;\n\nexport const bad = () => count;",
    "no-restricted-syntax",
    "No module-level mutable state",
  ],
  [
    "module-level mutable state in a fixture",
    files.fixture,
    "let count = 0;\n\nexport const bad = () => count;",
    "no-restricted-syntax",
    "No module-level mutable state",
  ],
  [
    "module-level mutable state in a contract",
    files.contract,
    "let count = 0;\n\nexport const bad = () => count;",
    "no-restricted-syntax",
    "No module-level mutable state",
  ],
  [
    "the core runtime in an adapter's entry point",
    files.adapterEntry,
    'import { Frame } from "@priemskiyyy/frame";\n\nexport type Bad = typeof Frame;\n',
    "@typescript-eslint/no-restricted-imports",
    "never the runtime",
  ],
  [
    "the mock in an adapter's source",
    files.adapter,
    'import { createMockAdapter } from "@priemskiyyy/frame/mock";\n\nexport const bad = createMockAdapter;\n',
    "@typescript-eslint/no-restricted-imports",
    "never imports the Frame mock or conformance suite",
  ],
  [
    "the conformance suite in an adapter's source",
    files.adapter,
    'import { testWidgetAdapter } from "@priemskiyyy/frame/testing";\n\nexport const bad = testWidgetAdapter;\n',
    "@typescript-eslint/no-restricted-imports",
    "never imports the Frame mock or conformance suite",
  ],
  [
    "the mock in the react package's source",
    files.react,
    'import { createMockAdapter } from "@priemskiyyy/frame/mock";\n\nexport const bad = createMockAdapter;\n',
    "@typescript-eslint/no-restricted-imports",
    "never imports the Frame mock or conformance suite",
  ],
  [
    "the conformance suite in the react package's source",
    files.react,
    'import { testWidgetAdapter } from "@priemskiyyy/frame/testing";\n\nexport const bad = testWidgetAdapter;\n',
    "@typescript-eslint/no-restricted-imports",
    "never imports the Frame mock or conformance suite",
  ],
  [
    "a test runner in the conformance suite",
    files.conformance,
    'import { expect } from "vitest";\n\nexport const bad = expect;\n',
    "@typescript-eslint/no-restricted-imports",
    "never imports a test runner",
  ],
];

// [name, file, code]: what a rule's exceptions must keep allowing, written clean.
const allowed = [
  ["a void return type", files.shipped, "export type Callback = () => void;\n"],
  [
    "expect.any with a constructor",
    files.test,
    'import { expect } from "vitest";\n\nexport const ok = () => expect(1).toEqual(expect.any(Number));\n',
  ],
  [
    "a number parsed with parseInt",
    files.shipped,
    "export const ok = (text: string) => Number.parseInt(text, 10);\n",
  ],
  [
    "a type import of a provider SDK",
    files.shipped,
    'import type { Widget } from "expo-widgets";\n\nexport type Ok = Widget | null;\n',
  ],
  [
    "react in the react package",
    files.react,
    'import { useState } from "react";\n\nexport const ok = useState;\n',
  ],
  [
    "a test runner in a test",
    files.test,
    'import { expect } from "vitest";\n\nexport const ok = expect;\n',
  ],
  [
    "a re-export at an entry point",
    files.entry,
    'export { thing } from "src/thing";\n',
  ],
  [
    "the host clock in the system clock",
    files.clock,
    "export const ok = () => Date.now();\n",
  ],
  [
    "the host clock in a test",
    files.test,
    "export const ok = () => Date.now();\n",
  ],
  [
    "guard, then work",
    files.shipped,
    "export const ok = (value: boolean) => {\n  if (!value) {\n    return 0;\n  }\n\n  return 1;\n};\n",
  ],
  [
    "a ternary as a value that is not returned",
    files.shipped,
    "export const ok = (value: boolean) => {\n  const next = value ? 1 : 0;\n\n  return next;\n};\n",
  ],
  [
    "an async arrow with a plain parameter",
    files.shipped,
    "export const ok = async (id: number) => id;\n",
  ],
  [
    "a group of constants in a constants file",
    files.constants,
    "/** One. */\nexport const FIRST = 1;\n\n/** Two. */\nexport const SECOND = 2;\n",
  ],
  [
    "a group of constants in the example's constants file",
    files.exampleConstants,
    "export const FIRST = 1;\n\nexport const SECOND = 2;\n",
  ],
  [
    "overload signatures of one function",
    files.overload,
    "export function ok(value: string): string;\n\nexport function ok(value: number): number;\n\nexport function ok(value: string | number) {\n  return value;\n}\n",
  ],
  [
    "a local let inside a function",
    files.shipped,
    "export const ok = () => {\n  let count = 0;\n\n  count += 1;\n\n  return count;\n};\n",
  ],
  [
    "a class with a private field",
    files.shipped,
    "export class Ok {\n  #count = 0;\n\n  next = () => {\n    this.#count += 1;\n\n    return this.#count;\n  };\n}\n",
  ],
  [
    "a test file with several exports",
    files.test,
    "export const first = 1;\n\nexport const second = 2;\n",
  ],
  [
    "the Register interface, which declaration merging needs, beside its registered types",
    files.register,
    "export interface Register {}\n\nexport type RegisteredFrame = Register extends { frame: infer TFrame } ? TFrame : null;\n",
  ],
  [
    "the example's Register augmentation",
    files.exampleRegister,
    'import type { Frame } from "@priemskiyyy/frame";\n\ndeclare module "@priemskiyyy/frame-react" {\n  interface Register {\n    frame: Frame;\n  }\n}\n',
  ],
  [
    "the contract subpath in an adapter's source",
    files.adapter,
    'import type { JsonRecord } from "@priemskiyyy/frame/adapter";\n\nexport type Ok = JsonRecord;\n',
  ],
  [
    "the core runtime in an adapter's test",
    files.adapterTest,
    'import { Frame } from "@priemskiyyy/frame";\n\nexport const ok = Frame;\n',
  ],
  [
    "a script reading process",
    files.script,
    "export const ok = () => process.argv;\n",
  ],
  [
    "a type re-export at an entry point",
    files.entry,
    'export type { Thing } from "src/thing";\n',
  ],
  [
    "a re-export at an adapter's entry point",
    files.adapterEntry,
    'export { thing } from "src/thing";\n\nexport type { Thing } from "src/types/Thing";\n',
  ],
  [
    "the host timers in the system clock",
    files.clock,
    "export const ok = () => setTimeout(() => 1, 10);\n",
  ],
  [
    "a provider's own widgetId",
    files.shipped,
    "export const ok = (info: { widgetId: number }) => info.widgetId;\n",
  ],
  [
    "an identifier inside its object",
    files.shipped,
    'export const ok = { request: { id: 1 }, widget: { key: "streak" } };\n',
  ],
  [
    "a class with a constructor and an arrow field",
    files.shipped,
    "export class Ok {\n  #count: number;\n\n  constructor(count: number) {\n    this.#count = count;\n  }\n\n  next = () => this.#count;\n}\n",
  ],
  [
    "a class method in a test",
    files.test,
    "export class Fake {\n  next() {\n    return 1;\n  }\n}\n",
  ],
  [
    "a collection inside a function",
    files.shipped,
    "export const ok = () => {\n  const seen = new Set<number>();\n\n  return seen;\n};\n",
  ],
  [
    "an optional field typed with undefined",
    files.shipped,
    "export type Ok = { name?: string | undefined };\n",
  ],
  [
    "an optional field that is undefined alone",
    files.shipped,
    "export type Ok = { issues?: undefined };\n",
  ],
  [
    "a provider's own optional field in the Expo environment",
    files.providerMirror,
    'export type Ok = { colorScheme?: "light" | "dark" };\n',
  ],
  [
    "an optional field in a fake",
    files.fixture,
    "export type Fake = { name?: string };\n",
  ],
  [
    "a guard, then work, inside a try",
    files.shipped,
    "export const ok = (flag: boolean) => {\n  try {\n    if (!flag) {\n      return 0;\n    }\n\n    return 1;\n  } finally {\n    flag.toString();\n  }\n};\n",
  ],
  [
    "a flat test",
    files.test,
    'import { expect, test } from "vitest";\n\ntest("one is one", () => {\n  expect(1).toBe(1);\n});\n',
  ],
  [
    "the console in a test",
    files.test,
    "export const ok = () => console.log(1);\n",
  ],
  [
    "the mock in an adapter's test",
    files.adapterTest,
    'import { createMockAdapter } from "@priemskiyyy/frame/mock";\n\nexport const ok = createMockAdapter;\n',
  ],
  [
    "the conformance suite in an adapter's fixture",
    files.adapterFixture,
    'import { testWidgetAdapter } from "@priemskiyyy/frame/testing";\n\nexport const ok = testWidgetAdapter;\n',
  ],
  [
    "the mock in the react package's test",
    files.reactTest,
    'import { createMockAdapter } from "@priemskiyyy/frame/mock";\n\nexport const ok = createMockAdapter;\n',
  ],
];

// The host, engine and provider names shipped code may not reach. The list is
// written out here, so removing a name from the config fails, and so does a name
// the config adds without being listed.
const restrictedTimers = [
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "requestAnimationFrame",
  "requestIdleCallback",
  "setImmediate",
  "clearImmediate",
];

const restrictedHostNames = [
  "process",
  "window",
  "document",
  "navigator",
  "self",
  "XMLHttpRequest",
  "fetch",
  "BigInt",
  "structuredClone",
  "TextDecoder",
  "TextEncoder",
  "Buffer",
  "crypto",
  "URL",
  "URLSearchParams",
  "Intl",
  "WeakRef",
  "FinalizationRegistry",
  "localStorage",
  "sessionStorage",
  "location",
  "console",
];

const restrictedGlobals = [...restrictedTimers, ...restrictedHostNames];

const restrictedImports = [
  "expo",
  "expo-widgets",
  "@expo/ui",
  "react",
  "react-native",
  "react-native-android-widget",
  "@use-voltra/ios",
  "@use-voltra/ios-client",
  "@use-voltra/android",
  "@use-voltra/android-client",
];

// [a pattern of the config, an import it matches]
const runnerPatterns = [
  ["vitest", "vitest"],
  ["@testing-library/*", "@testing-library/react"],
  ["fast-check", "fast-check"],
];

const toolingPatterns = [
  ["@priemskiyyy/frame/mock", "@priemskiyyy/frame/mock"],
  ["@priemskiyyy/frame/testing", "@priemskiyyy/frame/testing"],
];

// The core is the one import an adapter refuses as a type too.
const typeRefused = new Set(["@priemskiyyy/frame"]);

const adapterImports = [...restrictedImports, "@priemskiyyy/frame"];

const reactImports = restrictedImports.filter((name) => name !== "react");

const packagePatterns = [...runnerPatterns, ...toolingPatterns];

// [a file, the imports and patterns shipped code there may not reach]
const importBoundaries = [
  [files.shipped, restrictedImports, runnerPatterns],
  [files.entry, restrictedImports, runnerPatterns],
  [files.conformance, restrictedImports, runnerPatterns],
  [files.adapter, adapterImports, packagePatterns],
  [files.adapterEntry, adapterImports, packagePatterns],
  [files.react, reactImports, packagePatterns],
  [files.reactEntry, reactImports, packagePatterns],
];

// Shipped code, its entry points and the conformance suite share every global.
const globalBoundaries = importBoundaries.map(([file]) => file);

// A probe written for shipped code is replayed on these files, except the ones
// where the rule does not apply: an entry point re-exports and holds no class,
// collection or optional field, and the react package runs React.
const exemptAtEntries = new Set([
  "a re-export outside an entry point",
  "two exports in one file",
  "an exported function declaration",
  "a class method",
  "a class getter",
  "a module-level Map",
  "a module-level Set",
  "a module-level WeakMap",
  "a module-level WeakSet",
  "an exported module-level collection",
  "an optional field without undefined",
]);

const replays = [
  [files.entry, exemptAtEntries],
  [files.conformance, new Set()],
  [files.adapter, new Set()],
  [files.adapterEntry, exemptAtEntries],
  [files.react, new Set(["react in the core"])],
  [files.reactEntry, new Set([...exemptAtEntries, "react in the core"])],
];

const lint = async (file, code) => {
  const [result] = await eslint.lintText(code, { filePath: file });

  return result.messages;
};

const rulesOf = async (file) =>
  (await eslint.calculateConfigForFile(file)).rules;

const syntaxOf = async (file) =>
  (await rulesOf(file))["no-restricted-syntax"].slice(1);

// A selector chooses between alternatives in four places: a comma list, a
// :matches() group, a regex alternation inside an attribute, and :function.
// Each choice is a site, written down by where it sits in the text.
const FUNCTION_NODES = [
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
];

const GROUP_START = /^:(not|has|matches|is)\(/;

const unreadable = (text) => new Error(`Cannot read the selector ${text}.`);

const indexAfter = (text, character, from) => {
  const found = text.indexOf(character, from);

  if (found === -1) {
    throw unreadable(text);
  }

  return found + 1;
};

const endOfBracket = (text, start) => {
  let index = start + 1;

  while (index < text.length) {
    const character = text[index];

    if (character === "'" || character === '"') {
      index = indexAfter(text, character, index + 1);

      continue;
    }

    if (character === "/" && text[index - 1] === "=") {
      index = indexAfter(text, "/", index + 1);

      continue;
    }

    if (character === "]") {
      return index;
    }

    index += 1;
  }

  throw unreadable(text);
};

const endOfGroup = (text, open) => {
  let depth = 0;
  let index = open;

  while (index < text.length) {
    const character = text[index];

    if (character === "[") {
      index = endOfBracket(text, index) + 1;

      continue;
    }

    if (character === "(") {
      depth += 1;
    }

    if (character === ")") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }

    index += 1;
  }

  throw unreadable(text);
};

const splitList = (text) => {
  const parts = [];
  let depth = 0;
  let from = 0;
  let index = 0;

  while (index < text.length) {
    const character = text[index];

    if (character === "[") {
      index = endOfBracket(text, index) + 1;

      continue;
    }

    if (character === "(") {
      depth += 1;
    }

    if (character === ")") {
      depth -= 1;
    }

    if (character === "," && depth === 0) {
      parts.push(text.slice(from, index).trim());
      from = index + 1;
    }

    index += 1;
  }

  parts.push(text.slice(from).trim());

  return parts;
};

const findSites = (selector) => {
  const sites = [];
  const list = splitList(selector);
  let index = 0;

  if (list.length > 1) {
    sites.push({ start: 0, end: selector.length, alternatives: list });
  }

  while (index < selector.length) {
    if (selector[index] === "[") {
      const end = endOfBracket(selector, index);
      const attribute = selector.slice(index, end + 1);
      const regex = /=\/(.*)\/\]$/.exec(attribute);

      if (regex !== null) {
        const offset = index + regex.index + 2;

        for (const group of regex[1].matchAll(/\(([^()]*\|[^()]*)\)/g)) {
          sites.push({
            start: offset + group.index,
            end: offset + group.index + group[0].length,
            alternatives: group[1].split("|"),
          });
        }
      }

      index = end + 1;

      continue;
    }

    const group = GROUP_START.exec(selector.slice(index));

    if (group !== null) {
      const open = index + group[0].length - 1;
      const end = endOfGroup(selector, open);
      const alternatives = splitList(selector.slice(open + 1, end));

      if (group[1] === "matches" || group[1] === "is") {
        sites.push({
          start: index,
          end: end + 1,
          alternatives: alternatives.map((one) => `:matches(${one})`),
        });
      }

      index = end + 1;

      continue;
    }

    if (selector.startsWith(":function", index)) {
      sites.push({
        start: index,
        end: index + ":function".length,
        alternatives: FUNCTION_NODES,
      });
    }

    index += 1;
  }

  return sites;
};

// Every alternative of a selector as a selector of its own: one site narrowed
// to one alternative, the others left as they are.
const alternativesOf = (selector) =>
  findSites(selector).flatMap((site, siteIndex) =>
    site.alternatives.map((alternative, alternativeIndex) => ({
      site: siteIndex,
      alternative: alternativeIndex,
      label: alternative,
      text: `${selector.slice(0, site.start)}${alternative}${selector.slice(site.end)}`,
    })),
  );

// The same config with each selector's message replaced by where it sits, so a
// probe says which selector and which alternative it reached.
const taggedLinters = new Map();

const taggedLinterFor = async (file) => {
  const known = taggedLinters.get(file);

  if (known !== undefined) {
    return known;
  }

  const entries = await syntaxOf(file);

  const restrictions = entries.flatMap(({ selector }, entry) => [
    { selector, message: `${entry}|-1|0` },
    ...alternativesOf(selector).map(({ site, alternative, text }) => ({
      selector: text,
      message: `${entry}|${site}|${alternative}`,
    })),
  ]);

  const made = {
    entries,
    linter: new ESLint({
      overrideConfig: [
        {
          files: ["**/*.{ts,tsx,mjs,js}"],
          rules: { "no-restricted-syntax": ["error", ...restrictions] },
        },
      ],
    }),
  };

  taggedLinters.set(file, made);

  return made;
};

// A probe owns a selector when no other selector of the file gives its message,
// and owns an alternative when it reaches that alternative of its site alone.
// Dropping an owned alternative from the config then turns the probe red.
const owned = new Set();

const credit = async (file, code, fragment) => {
  const { entries, linter } = await taggedLinterFor(file);
  const [result] = await linter.lintText(code, { filePath: file });
  const hits = new Map();

  for (const message of result.messages) {
    if (message.ruleId !== "no-restricted-syntax") {
      continue;
    }

    const [entry, site, alternative] = message.message
      .split("|")
      .map((part) => Number.parseInt(part, 10));

    const sites = hits.get(entry) ?? new Map();
    const alternatives = sites.get(site) ?? new Set();

    alternatives.add(alternative);
    sites.set(site, alternatives);
    hits.set(entry, sites);
  }

  const owners = [...hits.keys()].filter((entry) =>
    entries[entry].message.includes(fragment),
  );

  if (owners.length !== 1) {
    return;
  }

  const [owner] = owners;

  for (const [site, alternatives] of hits.get(owner)) {
    if (alternatives.size === 1) {
      const [alternative] = alternatives;

      owned.add(`${entries[owner].selector}|${site}|${alternative}`);
    }
  }
};

const failures = [];

for (const [name, file, code, rule, fragment] of rejected) {
  const messages = await lint(file, code);

  const matched = messages.some(
    (message) => message.ruleId === rule && message.message.includes(fragment),
  );

  if (!matched) {
    failures.push(`Lint failed to reject ${name} with ${rule}.`);
  }

  if (rule === "no-restricted-syntax") {
    await credit(file, code, fragment);
  }
}

for (const [name, file, code] of allowed) {
  const errors = (await lint(file, code)).filter(
    (message) => message.severity === 2,
  );

  if (errors.length > 0) {
    failures.push(
      `Lint must allow ${name}, and said: ${errors.map((error) => `${error.ruleId}: ${error.message}`).join("; ")}`,
    );
  }
}

for (const [file, exempt] of replays) {
  for (const [name, source, code, rule, fragment] of rejected) {
    if (source !== files.shipped || exempt.has(name)) {
      continue;
    }

    const matched = (await lint(file, code)).some(
      (message) =>
        message.ruleId === rule && message.message.includes(fragment),
    );

    if (!matched) {
      failures.push(`Lint failed to reject ${name} in ${file}.`);
    }
  }
}

for (const file of globalBoundaries) {
  for (const name of restrictedGlobals) {
    const messages = await lint(file, `export const bad = () => ${name};\n`);

    if (
      !messages.some((message) => message.ruleId === "no-restricted-globals")
    ) {
      failures.push(`Lint failed to reject the global ${name} in ${file}.`);
    }
  }
}

const clockGlobals = restrictedHostNames;

for (const name of clockGlobals) {
  const messages = await lint(
    files.clock,
    `export const bad = () => ${name};\n`,
  );

  if (!messages.some((message) => message.ruleId === "no-restricted-globals")) {
    failures.push(`Lint failed to reject the global ${name} in the clock.`);
  }
}

for (const [file, names, patterns] of importBoundaries) {
  for (const name of names) {
    const runtime = await lint(
      file,
      `import { thing } from "${name}";\n\nexport const bad = thing;\n`,
    );

    const typeOnly = await lint(
      file,
      `import type { Thing } from "${name}";\n\nexport type Ok = Thing | null;\n`,
    );

    const refusedAsRuntime = (messages) =>
      messages.some(
        (message) =>
          message.ruleId === "@typescript-eslint/no-restricted-imports",
      );

    if (!refusedAsRuntime(runtime)) {
      failures.push(`Lint failed to reject a runtime import of ${name}.`);
    }

    if (typeRefused.has(name) && !refusedAsRuntime(typeOnly)) {
      failures.push(`Lint failed to reject a type import of ${name}.`);
    }

    if (!typeRefused.has(name) && refusedAsRuntime(typeOnly)) {
      failures.push(`Lint must allow a type import of ${name} in ${file}.`);
    }
  }

  for (const [, example] of patterns) {
    const runtime = await lint(
      file,
      `import { thing } from "${example}";\n\nexport const bad = thing;\n`,
    );

    if (
      !runtime.some(
        (message) =>
          message.ruleId === "@typescript-eslint/no-restricted-imports",
      )
    ) {
      failures.push(`Lint failed to reject a runtime import of ${example}.`);
    }
  }
}

const compare = (kind, file, expected, actual) => {
  for (const name of expected) {
    if (!actual.includes(name)) {
      failures.push(`The config no longer restricts the ${kind} ${name}.`);
    }
  }

  for (const name of actual) {
    if (!expected.includes(name)) {
      failures.push(`No probe covers the restricted ${kind} ${name}.`);
    }
  }
};

for (const [file, names, patterns] of importBoundaries) {
  const [, options] = (await rulesOf(file))[
    "@typescript-eslint/no-restricted-imports"
  ];

  compare(
    "import",
    file,
    names,
    options.paths.map(({ name }) => name),
  );

  compare(
    "import pattern",
    file,
    patterns.map(([pattern]) => pattern),
    (options.patterns ?? []).flatMap(({ group }) => group),
  );
}

for (const [file, expected] of [
  ...globalBoundaries.map((file) => [file, restrictedGlobals]),
  [files.clock, clockGlobals],
]) {
  const configured = (await rulesOf(file))["no-restricted-globals"]
    .slice(1)
    .map(({ name }) => name);

  compare("global", file, expected, configured);
}

// Every selector of every file group, and every alternative inside it, must be
// owned by a probe.
const reported = new Set();

for (const file of Object.values(files)) {
  for (const { selector, message } of await syntaxOf(file)) {
    const alternatives = alternativesOf(selector);

    const required =
      alternatives.length === 0
        ? [{ site: -1, alternative: 0, label: selector }]
        : alternatives;

    for (const { site, alternative, label } of required) {
      const key = `${selector}|${site}|${alternative}`;

      if (!owned.has(key) && !reported.has(key)) {
        reported.add(key);
        failures.push(
          `No probe of its own reaches ${label} of ${selector} (${file}): ${message}`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `${rejected.length} probes rejected, ${allowed.length} allowed, ${restrictedGlobals.length} globals and ${restrictedImports.length} imports restricted, and every selector and alternative owned by a probe.`,
);

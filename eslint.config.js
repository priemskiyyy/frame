import eslint from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const toRestrictions = (entries) =>
  entries.map(([selector, message]) => ({ selector, message }));

const relativeImports = toRestrictions([
  [
    "ImportDeclaration[source.value=/^[.]/]",
    "Use src/... imports or public package imports.",
  ],
  [
    "ExportNamedDeclaration[source.value=/^[.]/]",
    "Use src/... imports for public exports.",
  ],
  [
    "ImportExpression[source.value=/^[.]/]",
    "Use src/... imports for dynamic imports.",
  ],
  [
    "TSImportType[source.value=/^[.]/]",
    "Use src/... imports for imported types.",
  ],
]);

// A constructor called as a function converts whatever it is given; name the
// conversion instead.
const constructorConversions = toRestrictions([
  [
    ":matches(CallExpression, NewExpression)[callee.name='Number']",
    "Do not convert with Number(): parse text with Number.parseInt(value, 10) or Number.parseFloat(value).",
  ],
  [
    ":matches(CallExpression, NewExpression)[callee.name='String']",
    "Do not convert with String(): call value.toString() or write a template literal.",
  ],
  [
    ":matches(CallExpression, NewExpression)[callee.name='Boolean']",
    'Do not convert with Boolean(): compare explicitly, such as value !== null or text !== "".',
  ],
  [
    ":matches(CallExpression, NewExpression)[callee.name=/^(BigInt|Object)$/]",
    "Do not convert with BigInt() or Object(): write the literal you mean.",
  ],
  [
    "CallExpression:not([callee.object.name='expect'][callee.property.name='any']) > Identifier.arguments[name=/^(Number|String|Boolean|BigInt|Object)$/]",
    "Do not pass a constructor as a conversion callback: write the arrow, such as (part) => Number.parseInt(part, 10) or (value) => value !== null.",
  ],
]);

const bannedSyntax = toRestrictions([
  [
    "TSAsExpression",
    "Do not use type assertions, including as const. Narrow the value, annotate the type, or use satisfies.",
  ],
  [
    "TSTypeAssertion",
    "Do not use type assertions. Narrow the value, annotate the type, or use satisfies.",
  ],
  ["TSNonNullExpression", "Narrow nullable values before using them."],
  [
    "TSUnknownKeyword",
    "Name the contract instead of unknown: a generic, a union or a parsed type.",
  ],
  ["TSEnumDeclaration", "Use a string union instead of an enum."],
  ["SwitchStatement", "Use explicit conditional dispatch."],
  [
    "UnaryExpression[operator='void']",
    "Handle promise completion and failures explicitly.",
  ],
  ["AssignmentExpression[operator='??=']", "Use explicit assignment."],
  ["AssignmentExpression[operator='||=']", "Use explicit assignment."],
  ["AssignmentExpression[operator='&&=']", "Use explicit assignment."],
  ["TSPropertySignature[readonly=true]", "Use mutable public property types."],
  ["TSIndexSignature[readonly=true]", "Use mutable index signatures."],
  ["PropertyDefinition[readonly=true]", "Use mutable property types."],
  ["TSParameterProperty[readonly=true]", "Use mutable property types."],
  [
    "TSMappedType[readonly]",
    "Do not add readonly mapped modifiers. Use the mutable type; published data is frozen at runtime.",
  ],
  ["TSTypeOperator[operator='readonly']", "Use mutable array types."],
  [
    "TSTypeReference[typeName.name=/^(Readonly|ReadonlyArray|ReadonlyMap|ReadonlySet|DeepReadonly)$/]",
    "Do not use readonly utility types. Use the mutable type; published data is frozen at runtime.",
  ],
  ["ExportAllDeclaration", "List public exports explicitly."],
  [
    "CallExpression[callee.property.name='map'][callee.object.callee.property.name='filter']",
    "Use one .flatMap() with early returns: return [] to skip, return [value] to keep.",
  ],
  [
    "CallExpression[callee.property.name='filter'][callee.object.callee.property.name='map']",
    "Use one .flatMap() with early returns: return [] to skip, return [value] to keep.",
  ],
  [
    "ReturnStatement > ConditionalExpression",
    "Return early from an if instead of returning a ternary.",
  ],
  [
    "ArrowFunctionExpression > ConditionalExpression.body",
    "Give the arrow a block that returns early from an if instead of a ternary body.",
  ],
  [
    ":function > BlockStatement > IfStatement[alternate=null]:last-child",
    "Guard, then work: write `if (!condition) { return; }` and do the work after it, instead of ending a function with an if block.",
  ],
  [
    ":matches(ForStatement, ForOfStatement, ForInStatement, WhileStatement, DoWhileStatement) > BlockStatement > IfStatement[alternate=null]:last-child",
    "Guard, then work: write `if (!condition) { continue; }` and do the work after it, instead of ending a loop body with an if block.",
  ],
  [
    ":matches(TryStatement > BlockStatement.block, TryStatement > BlockStatement.finalizer, CatchClause > BlockStatement.body) > IfStatement[alternate=null]:last-child",
    "Guard, then work: write `if (!condition) { return; }` and do the work after it, instead of ending a try, catch or finally block with an if block.",
  ],
  [
    "MemberExpression[property.name='throwIfAborted']",
    "React Native's AbortSignal has no throwIfAborted(): check signal.aborted.",
  ],
  [
    "MemberExpression[object.name='AbortSignal'][property.name=/^(abort|any|timeout)$/]",
    "React Native's AbortSignal has no static abort(), any() or timeout(): use an AbortController.",
  ],
  [
    "MemberExpression[property.name='reason'][object.property.name='signal']",
    "React Native's AbortSignal has no reason: reject with an error of your own.",
  ],
  [
    "MemberExpression[object.name='signal'][property.name='reason']",
    "React Native's AbortSignal has no reason: reject with an error of your own.",
  ],
]).concat(constructorConversions);

// A file is named for what it exports, so it exports one thing and holds no
// state at module scope.
const moduleSyntax = toRestrictions([
  [
    "ExportDefaultDeclaration",
    "Use a named export: a default export is renamed at every import.",
  ],
  [
    "Program > VariableDeclaration[kind='let']",
    "No module-level mutable state: hold it in a class field or a closure.",
  ],
  [
    "Program > ExportNamedDeclaration > VariableDeclaration[kind='let']",
    "No module-level mutable state: hold it in a class field or a closure.",
  ],
]);

const exportSyntax = toRestrictions([
  [
    "Program > ExportNamedDeclaration ~ ExportNamedDeclaration",
    "Export one thing per file, named for it. A group of constants goes in a constants/ file.",
  ],
  [
    "ExportNamedDeclaration > FunctionDeclaration",
    "Export an arrow function, one per file: export const name = () => {}. Only an overloaded function keeps its declarations.",
  ],
]);

// A thing's identifier is a field of the thing, so the name carries no suffix.
// A provider's own names, such as widgetId, are not Frame's to rename.
const identifierSyntax = toRestrictions([
  [
    "PrivateIdentifier[name=/^[a-z][A-Za-z]*(Id|Key)$/]",
    "An identifier lives in its object: hold #latest = { id } instead of #latestRequestId.",
  ],
  [
    "Identifier[name=/^(request|context|session|adapter|operation|snapshot|handle|lane)(Id|Key)$/]",
    "An identifier lives in its object: write request: { id }, never requestId.",
  ],
  [
    "Identifier[name='widgetKey']",
    "An identifier lives in its object: write widget: { key }, never widgetKey.",
  ],
]);

const stateSyntax = toRestrictions([
  [
    "ClassBody > MethodDefinition[kind!='constructor']",
    "Write a class member as an arrow field, such as next = () => {}, and keep state in #private fields.",
  ],
  [
    ":matches(Program, ExportNamedDeclaration) > VariableDeclaration > VariableDeclarator[init.type='NewExpression'][init.callee.name=/^(Map|Set|WeakMap|WeakSet)$/]",
    "No module-level mutable state: hold a collection in a class field or a closure.",
  ],
]);

const optionalFieldSyntax = toRestrictions([
  [
    "TSPropertySignature[optional=true]:not(:has(TSUndefinedKeyword))",
    "Type an optional field as name?: T | undefined, so a caller may pass undefined. Only a *Like type that mirrors a provider's own ?: T keeps it.",
  ],
]);

const entryShape = toRestrictions([
  [
    "Program > :not(ExportNamedDeclaration[source])",
    "An entry point only re-exports the public API by name: put code in its own file and re-export it.",
  ],
]);

const testSyntax = toRestrictions([
  [
    "ImportDeclaration[source.value='vitest'] > ImportSpecifier[imported.name=/^(describe|it|suite)$/]",
    "Write flat test() calls named as the invariant they guard, not describe, it or suite groups.",
  ],
]);

const reexports = toRestrictions([
  [
    "ExportNamedDeclaration[source]",
    "Keep explicit re-exports at public package entry points only.",
  ],
]);

// Every instant is read from the Frame clock, so tests control time; only the
// system clock reads the host's time and timers.
const clockReads = toRestrictions([
  [
    "MemberExpression[object.name='Date'][property.name='now']",
    "Read the time through the Frame clock: new Frame({ ..., clock }).",
  ],
  [
    "NewExpression[callee.name='Date'][arguments.length=0]",
    "Read the time through the Frame clock: new Frame({ ..., clock }).",
  ],
  [
    "CallExpression[callee.name='Date']",
    "Read the time through the Frame clock: new Frame({ ..., clock }).",
  ],
  [
    "MemberExpression[object.name='performance'][property.name='now']",
    "Read the time through the Frame clock: new Frame({ ..., clock }).",
  ],
  [
    "CallExpression[callee.name=/^(setTimeout|clearTimeout|setInterval|clearInterval)$/]",
    "Schedule through the Frame clock, never the host's timers.",
  ],
  [
    "MemberExpression[object.name='Math'][property.name='random']",
    "Frame draws no randomness: identifiers come from counters.",
  ],
]);

// The engines a React Native app runs lack or change these (react-native 0.86
// and the Hermes it builds, V1 and classic), so library code depends on none.
const reactNativeSyntax = toRestrictions([
  [
    "ArrowFunctionExpression[async=true] > :matches(AssignmentPattern, ObjectPattern, ArrayPattern, RestElement).params",
    "Hermes V1 (React Native 0.84 and later) resolves undefined from an async arrow function whose parameter is not a plain name (facebook/hermes#1761), and an Expo or Metro build repairs it only when its Babel preset does: take a plain name and destructure or default in the body.",
  ],
  [
    "MemberExpression[object.name='structuredClone'], CallExpression[callee.name='structuredClone']",
    "Hermes has no structuredClone: copy the value explicitly.",
  ],
  [
    "CallExpression[callee.property.name=/^(toSorted|toReversed|toSpliced)$/]",
    "Hermes has no change-array-by-copy methods: copy, then sort.",
  ],
  [
    "MemberExpression[object.name=/^(Object|Map)$/][property.name='groupBy']",
    "Hermes has no groupBy: group in a loop.",
  ],
  [
    "MemberExpression[object.name='Promise'][property.name=/^(withResolvers|try)$/]",
    "Hermes classic has neither Promise.withResolvers nor Promise.try: make the promise with its executor.",
  ],
  [
    "MemberExpression[object.name='Symbol'][property.name=/^(dispose|asyncDispose)$/]",
    "Hermes has no Symbol.dispose.",
  ],
]);

// Adapters take the SDK the application configured and type it structurally,
// so no package source may import one at runtime. A type import is fine.
const providerImports = {
  paths: [
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
  ].map((name) => ({
    name,
    allowTypeImports: true,
    message:
      "No runtime code imports a provider SDK; the application passes it in, and the type is structural.",
  })),
  patterns: [
    {
      group: ["vitest", "@testing-library/*", "fast-check"],
      message: "Runtime code never imports a test runner or its helpers.",
    },
  ],
};

// The mock and the conformance suite are the application's and the tests', so
// no package source may import them either.
const frameToolingImports = {
  group: ["@priemskiyyy/frame/mock", "@priemskiyyy/frame/testing"],
  message:
    "Runtime code never imports the Frame mock or conformance suite: they belong in tests and fixtures.",
};

// The React package is the one package that runs React.
const reactImports = {
  paths: providerImports.paths.filter(({ name }) => name !== "react"),
  patterns: [...providerImports.patterns, frameToolingImports],
};

const hostTimers = [
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "requestAnimationFrame",
  "requestIdleCallback",
  "setImmediate",
  "clearImmediate",
].map((name) => ({
  name,
  message: "Schedule through the Frame clock, never the host's timers.",
}));

const loggingGlobals = [
  {
    name: "console",
    message:
      "Shipped code never logs: report through Frame diagnostics, or return an outcome.",
  },
];

const hostGlobals = [
  "process",
  "window",
  "document",
  "navigator",
  "self",
  "XMLHttpRequest",
  "fetch",
].map((name) => ({
  name,
  message:
    "Shipped code is platform neutral: a host is reached only through what the application passes in.",
}));

// React Native's engines and older browsers lack these, so library code
// detects nothing and depends on none of them.
const portableGlobals = [
  ["BigInt", "Compare decimal strings without BigInt."],
  [
    "structuredClone",
    "Copy values explicitly; structuredClone is missing on React Native.",
  ],
  ["TextDecoder", "Decode explicitly; TextDecoder is missing on React Native."],
  ["TextEncoder", "Encode explicitly; TextEncoder is missing on React Native."],
  ["Buffer", "React Native has no Buffer."],
  [
    "crypto",
    "React Native has no global crypto: Frame identifiers come from counters.",
  ],
  [
    "URL",
    "React Native's URL has a setter for search only and reads only http(s) URLs: build the string.",
  ],
  [
    "URLSearchParams",
    "React Native's URLSearchParams cuts a value at its second '=': build the string.",
  ],
  [
    "Intl",
    "Hermes has Intl.Collator, DateTimeFormat and NumberFormat only: format in the application.",
  ],
  ["WeakRef", "Hermes classic has no WeakRef."],
  ["FinalizationRegistry", "Hermes has no FinalizationRegistry."],
  [
    "localStorage",
    "React Native has no localStorage: the application passes its storage in.",
  ],
  [
    "sessionStorage",
    "React Native has no sessionStorage: the application passes its storage in.",
  ],
  ["location", "React Native has no location."],
].map(([name, message]) => ({ name, message }));

const typescriptRules = {
  curly: ["error", "all"],
  "no-else-return": ["error", { allowElseIf: false }],
  "@typescript-eslint/consistent-type-imports": "error",
  "@typescript-eslint/consistent-type-definitions": ["error", "type"],
  "@typescript-eslint/consistent-type-assertions": [
    "error",
    { assertionStyle: "never" },
  ],
  "@typescript-eslint/no-explicit-any": "error",
  "no-restricted-syntax": ["error", ...relativeImports, ...bannedSyntax],
};

const testFiles = [
  "packages/**/src/**/*.test.{ts,tsx}",
  "packages/**/src/**/*.fixture.{ts,tsx}",
  "packages/**/src/**/*.contracts.{ts,tsx}",
];

// The system clock is the one place that may read the host's time and timers,
// as the default of the clock option.
const clockDefault =
  "packages/core/src/utils/internal/clock/createSystemClock.ts";

const entryPoints = [
  "packages/*/src/index.ts",
  "packages/adapters/*/src/index.ts",
  "packages/core/src/adapter.ts",
  "packages/core/src/mock.ts",
  "packages/core/src/testing.ts",
];

const sharedGlobals = [...hostGlobals, ...portableGlobals, ...loggingGlobals];

const unitSyntax = [
  ...relativeImports,
  ...bannedSyntax,
  ...moduleSyntax,
  ...identifierSyntax,
];

const packageSyntax = [...unitSyntax, ...reexports];

const entrySyntax = [
  ...unitSyntax,
  ...clockReads,
  ...reactNativeSyntax,
  ...entryShape,
];

const shippedSyntax = [
  ...packageSyntax,
  ...clockReads,
  ...reactNativeSyntax,
  ...stateSyntax,
  ...optionalFieldSyntax,
];

const exampleSyntax = [...unitSyntax, ...reactNativeSyntax];

const without = (rules, excluded) =>
  rules.filter((rule) => !excluded.includes(rule));

// Mirrors a provider's own types, optional fields as ?: T.
const providerMirrorFile =
  "packages/adapters/expo/src/types/ExpoWidgetEnvironmentLike.ts";

const overloadFiles = [
  "packages/core/src/utils/widget.ts",
  "packages/core/src/utils/internal/widgets/typeHandle.ts",
  "packages/core/src/utils/internal/widgets/typeRecord.ts",
];

// The declaration-merging target applications augment with their Frame: an
// interface is the only thing that merges, and it exports its registered types
// beside it.
const registerFiles = [
  "packages/react/src/types/Register.ts",
  "packages/react/src/types/Register.fixture.ts",
  "examples/**/src/frames/Register.ts",
];

const constantFiles = [
  "packages/**/src/**/constants/*.ts",
  "examples/**/src/**/constants/*.ts",
];

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "coverage/**",
      "**/node_modules/**",
      "**/.expo/**",
      ".artifacts/**",
      "docs/.vitepress/cache/**",
      "docs/.vitepress/dist/**",
      "test-results/**",
      "playwright-report/**",
      "examples/**/uniwind-types.d.ts",
      "examples/**/metro.config.js",
    ],
  },
  {
    // No inline comment can switch a rule off; an exception is a file-scoped block here.
    linterOptions: { noInlineConfig: true },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    rules: {
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: ["const", "let"] },
        { blankLine: "always", prev: ["const", "let"], next: "*" },
        {
          blankLine: "any",
          prev: ["singleline-const", "singleline-let"],
          next: ["singleline-const", "singleline-let"],
        },
        { blankLine: "always", prev: "*", next: "block-like" },
        { blankLine: "always", prev: "block-like", next: "*" },
        { blankLine: "always", prev: "*", next: "return" },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: typescriptRules,
  },
  {
    files: ["packages/**/src/**/*.{ts,tsx}"],
    ignores: entryPoints,
    rules: { "no-restricted-syntax": ["error", ...packageSyntax] },
  },
  {
    // Shipped code, entry points included: no host globals, no host time, no provider SDK, no test runner.
    files: ["packages/**/src/**/*.{ts,tsx}"],
    ignores: [...testFiles, clockDefault],
    rules: {
      "@typescript-eslint/no-restricted-imports": ["error", providerImports],
      "no-restricted-globals": ["error", ...hostTimers, ...sharedGlobals],
      "no-restricted-syntax": ["error", ...shippedSyntax, ...exportSyntax],
    },
  },
  {
    // An entry point holds re-exports and nothing else, so it may re-export and export many names.
    files: entryPoints,
    rules: { "no-restricted-syntax": ["error", ...entrySyntax] },
  },
  {
    // A constants file exports a group, an overloaded function exports one signature per overload, and Register exports its registered types.
    files: [...constantFiles, ...overloadFiles, ...registerFiles],
    rules: { "no-restricted-syntax": ["error", ...shippedSyntax] },
  },
  {
    // The Expo environment mirrors the SDK's own WidgetEnvironment, optional fields as ?: T, so a render function written against the SDK's type is accepted.
    files: [providerMirrorFile],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...without(shippedSyntax, optionalFieldSyntax),
        ...exportSyntax,
      ],
    },
  },
  {
    // An adapter takes its types from the contract subpath, so it has no runtime dependency on the core: the application owns that.
    files: ["packages/adapters/*/src/**/*.{ts,tsx}"],
    ignores: testFiles,
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            ...providerImports.paths,
            {
              name: "@priemskiyyy/frame",
              message:
                "An adapter imports the contract from @priemskiyyy/frame/adapter, never the runtime.",
            },
          ],
          patterns: [...providerImports.patterns, frameToolingImports],
        },
      ],
    },
  },
  {
    // The React package renders with React and reads Frame's observables.
    files: ["packages/react/src/**/*.{ts,tsx}"],
    ignores: testFiles,
    rules: {
      "@typescript-eslint/no-restricted-imports": ["error", reactImports],
    },
  },
  {
    // The system clock owns the host's timers and time sources.
    files: [clockDefault],
    rules: {
      "no-restricted-globals": ["error", ...sharedGlobals],
      "no-restricted-syntax": ["error", ...packageSyntax, ...reactNativeSyntax],
    },
  },
  {
    // A test is a flat list of test() calls.
    files: ["packages/**/src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", ...packageSyntax, ...testSyntax],
    },
  },
  {
    // The examples are Hermes apps, so they follow the engine rules too.
    files: ["examples/**/*.{ts,tsx}"],
    rules: { "no-restricted-syntax": ["error", ...exampleSyntax] },
  },
  {
    files: ["examples/**/src/**/*.{ts,tsx}"],
    ignores: [...testFiles, ...constantFiles],
    rules: {
      "no-restricted-syntax": ["error", ...exampleSyntax, ...exportSyntax],
    },
  },
  {
    files: ["examples/**/src/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...exampleSyntax,
        ...exportSyntax,
        ...testSyntax,
      ],
    },
  },
  {
    // React rules only where React runs.
    files: ["packages/react/**/*.{ts,tsx}", "examples/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: registerFiles,
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
        fetch: "readonly",
        AbortSignal: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        Buffer: "readonly",
      },
    },
    rules: { "no-restricted-syntax": ["error", ...constructorConversions] },
  },
);

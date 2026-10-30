// Packs every package, then uses the tarballs the way an application would:
// installs them into an empty project, imports every entry, type-checks a
// consumer with declaration checking on, and inspects what would be published.
// What passes here is what a consumer gets, not what the workspace links.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspace = fileURLToPath(new URL("..", import.meta.url));
const scratch = mkdtempSync(path.join(tmpdir(), "frame-consumer-"));
const tarballs = path.join(scratch, "tarballs");
const consumer = path.join(scratch, "consumer");
const release = path.join(workspace, ".artifacts", "release");

const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 300_000,
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed in ${cwd}:\n${result.stdout}\n${result.stderr}`,
      { cause: result.error },
    );
  }

  return result.stdout;
};

const packages = ["packages", "packages/adapters"].flatMap((group) =>
  readdirSync(path.join(workspace, group)).flatMap((name) => {
    const directory = path.join(workspace, group, name);
    const manifestPath = path.join(directory, "package.json");

    if (!existsSync(manifestPath)) {
      return [];
    }

    return [
      {
        directory,
        isAdapter: group === "packages/adapters",
        manifest: JSON.parse(readFileSync(manifestPath, "utf8")),
      },
    ];
  }),
);

const failures = [];

const expect = (condition, message) => {
  if (!condition) {
    failures.push(message);
  }
};

const CONSUMER_DEPENDENCIES = {
  react: "19.2.8",
  "@types/react": "19.2.17",
  typescript: "5.8.3",
  zod: "4.1.12",
};

try {
  rmSync(release, { recursive: true, force: true });
  mkdirSync(tarballs, { recursive: true });
  mkdirSync(path.join(consumer, "src"), { recursive: true });

  // 1. What would be published, for each package.
  const packed = packages.map(({ directory, manifest, isAdapter }) => {
    run("pnpm", ["pack", "--pack-destination", tarballs], directory);

    const file = path.join(
      tarballs,
      `${manifest.name.replace("@", "").replace("/", "-")}-${manifest.version}.tgz`,
    );

    const listing = run("tar", ["-tzf", file], scratch).split("\n");
    const name = manifest.name;

    expect(manifest.version === "0.1.0", `${name} is not version 0.1.0.`);
    expect(manifest.license === "MIT", `${name} is not MIT.`);
    expect(manifest.sideEffects === false, `${name} has side effects.`);
    expect(
      manifest.dependencies === undefined,
      `${name} has runtime dependencies.`,
    );

    for (const required of [
      "package/README.md",
      "package/LICENSE",
      "package/package.json",
    ]) {
      expect(listing.includes(required), `${name} ships no ${required}.`);
    }

    for (const line of listing) {
      expect(
        !/^package\/(src|tasks|scripts)\/|\.test\.|\.fixture\.|\.contracts\./.test(
          line,
        ),
        `${name} ships ${line}, which is not part of the library.`,
      );
    }

    const packedManifest = JSON.parse(
      run("tar", ["-xzOf", file, "package/package.json"], scratch),
    );

    expect(
      !JSON.stringify(packedManifest).includes("workspace:"),
      `${name} still carries a workspace: protocol.`,
    );

    for (const [entry, target] of Object.entries(manifest.exports)) {
      expect(
        Object.keys(target).join() === "types,import,default" &&
          target.import === target.default,
        `${name} export ${entry} is not types, import, default on one ESM file.`,
      );
      expect(
        listing.includes(`package/${target.import.slice(2)}`),
        `${name} export ${entry} points at ${target.import}, which is not in the tarball.`,
      );
    }

    if (isAdapter) {
      const bundle = run(
        "tar",
        ["-xzOf", file, "package/dist/index.js"],
        scratch,
      );

      expect(
        !/from\s+"@priemskiyyy\/frame"/.test(bundle),
        `${name} imports the core runtime; an adapter takes types only.`,
      );
    }

    return { name, file };
  });

  // 2. An application: install the tarballs next to the peers it brings.
  writeFileSync(
    path.join(consumer, "package.json"),
    `${JSON.stringify(
      {
        name: "frame-consumer",
        private: true,
        type: "module",
        dependencies: {
          ...CONSUMER_DEPENDENCIES,
          ...Object.fromEntries(
            packed.map(({ name, file }) => [name, `file:${file}`]),
          ),
        },
      },
      null,
      2,
    )}\n`,
  );
  run("npm", ["install", "--no-audit", "--no-fund", "--silent"], consumer);

  // 3. Every published entry loads, and the runtime names are what the docs say.
  writeFileSync(
    path.join(consumer, "check.mjs"),
    `import assert from "node:assert/strict";
import * as core from "@priemskiyyy/frame";
import * as contract from "@priemskiyyy/frame/adapter";
import * as mock from "@priemskiyyy/frame/mock";
import * as testing from "@priemskiyyy/frame/testing";
import * as react from "@priemskiyyy/frame-react";
import * as expo from "@priemskiyyy/frame-expo";
import * as voltra from "@priemskiyyy/frame-voltra-ios";
import * as android from "@priemskiyyy/frame-android-widget";
import { z } from "zod";

assert.deepEqual(Object.keys(core).sort(), ["Frame", "FrameError", "widget"]);
assert.deepEqual(Object.keys(contract), []);
assert.deepEqual(Object.keys(mock).sort(), ["createMockAdapter", "createTestClock", "settle"]);
assert.deepEqual(Object.keys(testing), ["testWidgetAdapter"]);
assert.deepEqual(Object.keys(react).sort(), ["FrameProvider", "useFrame", "useFrameDiagnostics", "useWidget", "useWidgetData", "useWidgetStatus"]);
assert.deepEqual(Object.keys(expo), ["expoWidget"]);
assert.deepEqual(Object.keys(voltra), ["voltraPayloadWidget"]);
assert.deepEqual(Object.keys(android), ["androidWidget"]);

const streak = core.widget({
  name: "StreakWidget",
  schema: z.object({ days: z.number().int().nonnegative() }),
  fallback: { days: 0 },
});

const { adapter, control } = mock.createMockAdapter(streak);

const frame = new core.Frame({
  widgets: { streak },
  adapters: [adapter],
  clock: mock.createTestClock(),
});

const widget = frame.widget("streak");

assert.deepEqual(await widget.publish({ days: 3 }), {
  request: { id: "r1" },
  status: "submitted",
  kind: "snapshot",
  revision: 1,
  evidence: "simulated",
});
assert.deepEqual(widget.get(), { days: 3 });
assert.equal((await widget.publish({ days: 3 })).status, "unchanged");
assert.equal((await widget.publish({ days: -1 })).status, "invalid");
assert.equal(control.calls().length, 1);

const unhosted = new core.Frame({ widgets: { streak } });

assert.equal((await unhosted.widget("streak").publish({ days: 1 })).status, "unavailable");

assert.throws(() => new core.Frame({ widgets: { one: streak, two: streak } }), { code: "INVALID_CONFIGURATION" });

console.log("the packed entries load and publish");
`,
  );

  const loaded = run("node", ["check.mjs"], consumer);

  expect(
    loaded.includes("the packed entries load and publish"),
    "The packed entries did not run.",
  );

  // 4. A consumer that registers its Frame, then one that does not.
  writeFileSync(
    path.join(consumer, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          exactOptionalPropertyTypes: true,
          noUncheckedIndexedAccess: true,
          skipLibCheck: false,
          noEmit: true,
        },
        include: ["src"],
      },
      null,
      2,
    )}\n`,
  );

  writeFileSync(
    path.join(consumer, "src", "registered.ts"),
    `import { Frame, widget } from "@priemskiyyy/frame";
import type { WidgetHandle, WidgetStatus } from "@priemskiyyy/frame";
import type { WidgetAdapter } from "@priemskiyyy/frame/adapter";
import { createMockAdapter } from "@priemskiyyy/frame/mock";
import { FrameProvider, useFrame, useFrameDiagnostics, useWidget, useWidgetData, useWidgetStatus } from "@priemskiyyy/frame-react";
import { createElement } from "react";
import { z } from "zod";

const streak = widget({
  name: "StreakWidget",
  schema: z.object({ days: z.number().int().nonnegative() }),
  fallback: { days: 0 },
});

const { adapter } = createMockAdapter(streak);

export const frame = new Frame({ widgets: { streak }, adapters: [adapter] });

declare module "@priemskiyyy/frame-react" {
  interface Register {
    frame: typeof frame;
  }
}

export const mounted = createElement(FrameProvider, { frame });

export const useStreak = () => {
  const handle: WidgetHandle<{ days: number }> = useWidget("streak");
  const days: { days: number } | null = useWidgetData("streak");
  const status: WidgetStatus = useWidgetStatus("streak");

  const hostedBy: string | null = useFrameDiagnostics().widgets.streak.adapter?.name ?? null;

  return { handle, days, status, hostedBy, frame: useFrame() };
};

export const adapterContract: WidgetAdapter<{ days: number }> = adapter;

// @ts-expect-error a widget is named by a key the Frame registered
useWidget("missing");
const other = widget({
  name: "OtherWidget",
  schema: z.object({ days: z.number() }),
  fallback: { days: 0 },
});

// @ts-expect-error an adapter is for a widget the Frame lists
new Frame({ widgets: { streak }, adapters: [createMockAdapter(other).adapter] });
// @ts-expect-error the data is the widget's own
frame.widget("streak").publish({ days: "twelve" });
`,
  );

  writeFileSync(
    path.join(consumer, "tsconfig.unregistered.json"),
    `${JSON.stringify(
      {
        extends: "./tsconfig.json",
        include: ["unregistered"],
      },
      null,
      2,
    )}\n`,
  );

  mkdirSync(path.join(consumer, "unregistered"), { recursive: true });
  writeFileSync(
    path.join(consumer, "unregistered", "unregistered.ts"),
    `import { Frame, widget } from "@priemskiyyy/frame";
import { FrameProvider } from "@priemskiyyy/frame-react";
import { createElement } from "react";
import { z } from "zod";

const streak = widget({
  name: "StreakWidget",
  schema: z.object({ days: z.number() }),
  fallback: { days: 0 },
});

const frame = new Frame({ widgets: { streak } });

// @ts-expect-error without Register, the provider refuses a Frame typed by its own widgets
export const mounted = createElement(FrameProvider, { frame });
`,
  );

  run("node_modules/.bin/tsc", ["-p", "tsconfig.json"], consumer);
  run("node_modules/.bin/tsc", ["-p", "tsconfig.unregistered.json"], consumer);

  // The oldest resolution a React Native app still ships with cannot read
  // `exports`, and with skipLibCheck a subpath it cannot find would quietly
  // turn every adapter type into any. The expected errors in registered.ts
  // still being errors proves the types arrived.
  writeFileSync(
    path.join(consumer, "tsconfig.node10.json"),
    `${JSON.stringify(
      {
        extends: "./tsconfig.json",
        compilerOptions: { moduleResolution: "node10", skipLibCheck: true },
        include: ["src"],
      },
      null,
      2,
    )}\n`,
  );
  run("node_modules/.bin/tsc", ["-p", "tsconfig.node10.json"], consumer);

  // 5. Package metadata a registry and a bundler read.
  for (const { directory, manifest } of packages) {
    try {
      run(
        path.join(workspace, "node_modules/.bin/publint"),
        [directory, "--strict"],
        workspace,
      );
    } catch (error) {
      failures.push(`publint rejected ${manifest.name}: ${error.message}`);
    }
  }

  assert.equal(failures.length, 0, failures.join("\n"));

  mkdirSync(release, { recursive: true });

  for (const { file } of packed) {
    copyFileSync(file, path.join(release, path.basename(file)));
  }

  writeFileSync(
    path.join(release, "SHA256SUMS"),
    `${packed
      .map(({ file }) => {
        const checksum = createHash("sha256")
          .update(readFileSync(file))
          .digest("hex");

        return `${checksum}  ${path.basename(file)}`;
      })
      .join("\n")}\n`,
  );

  console.log(
    `${packages.length} packages packed, installed, imported, type-checked and linted as a consumer would.`,
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

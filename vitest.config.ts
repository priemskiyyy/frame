import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import type { TestProjectConfiguration } from "vitest/config";

type ProjectOptions = {
  environment: "node" | "jsdom";
  dedupe: string[];
};

const project = (
  directory: string,
  name: string,
  options: Partial<ProjectOptions> = {},
) =>
  ({
    extends: true,
    resolve: {
      alias: {
        src: fileURLToPath(
          new URL(`./${directory}/${name}/src`, import.meta.url),
        ),
      },
      dedupe: options.dedupe ?? [],
    },
    test: {
      name,
      include: [`${directory}/${name}/src/**/*.test.{ts,tsx}`],
      environment: options.environment ?? "node",
    },
  }) satisfies TestProjectConfiguration;

// Every adapter is an ordinary node project named after its folder, so a new
// one is tested without being listed here.
const adapterProjects = readdirSync(
  new URL("./packages/adapters", import.meta.url),
).flatMap((name) => {
  const manifest = new URL(
    `./packages/adapters/${name}/package.json`,
    import.meta.url,
  );

  if (!existsSync(manifest)) {
    return [];
  }

  return [project("packages/adapters", name)];
});

// The example is tested like an application: its pure logic, and the contract
// between its native configuration and its definitions.
const exampleProject: TestProjectConfiguration = {
  extends: true,
  resolve: {
    alias: {
      src: fileURLToPath(new URL("./examples/expo/src", import.meta.url)),
    },
  },
  test: {
    name: "example-expo",
    include: ["examples/expo/src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
};

export default defineConfig({
  test: {
    globals: false,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["packages/**/src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.fixture.ts",
        "**/*.contracts.ts",
        "**/types/**",
        "**/testing/**",
        "**/index.ts",
        "**/mock.ts",
        "**/testing.ts",
      ],
      reporter: ["text", "json-summary", "html"],
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 85 },
    },
    projects: [
      project("packages", "core"),
      project("packages", "react", {
        environment: "jsdom",
        // An adapter must render against the same React instance as the renderer under test.
        dedupe: ["react", "react-dom"],
      }),
      ...adapterProjects,
      exampleProject,
    ],
  },
});

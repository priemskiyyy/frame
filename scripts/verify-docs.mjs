import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const workspace = fileURLToPath(new URL("..", import.meta.url));

const SKIPPED = new Set([
  "node_modules",
  "dist",
  "ios",
  "android",
  ".expo",
  ".artifacts",
  "coverage",
  "tasks",
  ".git",
]);

const REMOVED_NAMES = [
  "defineWidget",
  "unavailableWidget",
  "HandleOf",
  "OperationHandles",
  "WidgetBinding",
  "createMockBinding",
  "testWidgetBinding",
];

const EM_DASH = String.fromCodePoint(0x2014);

const failures = [];

const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED.has(entry.name)) {
      return [];
    }

    const full = path.join(directory, entry.name);

    return entry.isDirectory() ? walk(full) : [full];
  });

const files = walk(workspace);
const relative = (file) => path.relative(workspace, file);

const markdown = files.filter((file) => file.endsWith(".md"));

const pages = markdown.filter((file) =>
  relative(file).startsWith(`docs${path.sep}`),
);

const texts = files.filter(
  (candidate) =>
    /\.(md|ts|tsx|mjs|js|json|yml|yaml)$/.test(candidate) &&
    relative(candidate) !== "pnpm-lock.yaml",
);

for (const file of texts) {
  const text = readFileSync(file, "utf8");

  if (text.includes(EM_DASH)) {
    failures.push(`${relative(file)} contains an em dash.`);
  }
}

// A comment in shipped code is one line, a provider quirk or a reason the code
// cannot say, so two // lines in a row are narration.
const shipped = files.filter(
  (file) =>
    /^packages[\\/].*[\\/]src[\\/].*\.tsx?$/.test(relative(file)) &&
    !/\.(test|fixture|contracts)\.tsx?$/.test(file),
);

for (const file of shipped) {
  const lines = readFileSync(file, "utf8").split("\n");
  let run = 0;

  for (const [index, line] of [...lines, ""].entries()) {
    if (/^\s*\/\//.test(line)) {
      run += 1;

      continue;
    }

    if (run >= 2) {
      failures.push(
        `${relative(file)}:${index - run + 1} has ${run} consecutive // lines: keep one line for a provider quirk or a reason, and delete the rest.`,
      );
    }

    run = 0;
  }
}

// Frontmatter and one h1 per page.
for (const file of pages) {
  const text = readFileSync(file, "utf8");

  if (!/^---\ndescription: .+\n---\n/.test(text)) {
    failures.push(`${relative(file)} has no frontmatter description.`);
  }

  const headings = text
    .replace(/```[\s\S]*?```/g, "")
    .split("\n")
    .filter((line) => /^# /.test(line));

  if (headings.length !== 1) {
    failures.push(
      `${relative(file)} has ${headings.length} h1 headings, not one.`,
    );
  }
}

// Relative links resolve.
for (const file of markdown) {
  const text = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");

  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) {
      continue;
    }

    const [pathname] = target.split("#");

    if (!existsSync(path.resolve(path.dirname(file), pathname))) {
      failures.push(`${relative(file)} links to ${target}, which is missing.`);
    }
  }
}

// A removed name is not taught.
for (const file of markdown) {
  const text = readFileSync(file, "utf8");

  for (const name of REMOVED_NAMES) {
    if (text.includes(name)) {
      failures.push(`${relative(file)} mentions the removed name ${name}.`);
    }
  }
}

// What each Frame package really exports, runtime names and types.
const packages = ["packages", "packages/adapters"].flatMap((group) =>
  readdirSync(path.join(workspace, group)).flatMap((name) => {
    const manifestPath = path.join(workspace, group, name, "package.json");

    if (!existsSync(manifestPath)) {
      return [];
    }

    return [
      {
        directory: path.join(workspace, group, name),
        manifest: JSON.parse(readFileSync(manifestPath, "utf8")),
      },
    ];
  }),
);

const parseNames = (declarations) =>
  [...declarations.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)].flatMap(
    ([, list]) =>
      list.split(",").flatMap((item) => {
        const name = item
          .replace(/^\s*type\s+/, "")
          .split(/\s+as\s+/)
          .at(-1)
          ?.trim();

        return name === undefined || name === "" ? [] : [name];
      }),
  );

const exportedNames = new Map();

for (const { directory, manifest } of packages) {
  for (const [entry, target] of Object.entries(manifest.exports)) {
    const specifier = path.posix.join(manifest.name, entry);
    const declarations = path.join(directory, target.types);
    const runtime = path.join(directory, target.import);

    if (!existsSync(declarations) || !existsSync(runtime)) {
      failures.push(`${specifier} is not built: run pnpm build first.`);

      continue;
    }

    const module = await import(pathToFileURL(runtime).href);

    exportedNames.set(
      specifier,
      new Set([
        ...Object.keys(module),
        ...parseNames(readFileSync(declarations, "utf8")),
      ]),
    );
  }
}

for (const file of markdown) {
  const text = readFileSync(file, "utf8");

  for (const [, block] of text.matchAll(/```(?:ts|tsx)\n([\s\S]*?)```/g)) {
    for (const [, list, source] of block.matchAll(
      /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"(@priemskiyyy\/[^"]+)"/g,
    )) {
      const known = exportedNames.get(source);

      if (known === undefined) {
        failures.push(`${relative(file)} imports from unknown ${source}.`);

        continue;
      }

      for (const item of list.split(",")) {
        const name = item
          .replace(/^\s*type\s+/, "")
          .split(/\s+as\s+/)[0]
          ?.trim();

        if (name !== undefined && name !== "" && !known.has(name)) {
          failures.push(
            `${relative(file)} imports ${name} from ${source}, which does not export it.`,
          );
        }
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `${markdown.length} markdown files checked: frontmatter, headings, links, removed names and snippet imports; ${texts.length} text files checked for typography, ${shipped.length} shipped sources for comment blocks.`,
);

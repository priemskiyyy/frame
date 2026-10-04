// Runs before a package is packed: a tarball with no code in it must never be
// publishable, and the files every entry point names must exist.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const manifest = JSON.parse(readFileSync("package.json", "utf8"));

const targets = (value) => {
  if (typeof value === "string") {
    return [value];
  }

  return Object.values(value).flatMap(targets);
};

const missing = targets({
  main: manifest.main,
  types: manifest.types,
  exports: manifest.exports,
}).filter((target) => !existsSync(path.resolve(target)));

if (missing.length > 0) {
  console.error(
    `${manifest.name} is not built: ${missing.join(", ")} missing. Run pnpm build first.`,
  );
  process.exit(1);
}

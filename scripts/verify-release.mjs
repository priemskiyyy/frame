// Checks what a registry and a reader see of each package before it is
// published: one version everywhere, a changelog entry for it, the manifest
// fields, the peer ranges that follow the version, and the license text.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspace = fileURLToPath(new URL("..", import.meta.url));
const read = (file) => readFileSync(path.join(workspace, file), "utf8");

const packages = ["packages", "packages/adapters"].flatMap((group) =>
  readdirSync(path.join(workspace, group)).flatMap((name) => {
    const directory = `${group}/${name}`;

    if (!existsSync(path.join(workspace, directory, "package.json"))) {
      return [];
    }

    return [
      { directory, manifest: JSON.parse(read(`${directory}/package.json`)) },
    ];
  }),
);

const failures = [];
const license = read("LICENSE");
const changelog = read("CHANGELOG.md");
const [{ manifest: first }] = packages;
const version = first.version;
const [major, minor] = version.split(".");

const expectedPeer = `>=${version.split(".").slice(0, 2).join(".")}.0 <${major}.${Number.parseInt(minor, 10) + 1}`;

const readme = read("README.md");
const unreleasedChangelog = changelog.includes(`## [${version}] - Unreleased`);
const unpublishedReadme = readme.includes("Nothing is published yet");

if (unreleasedChangelog !== unpublishedReadme) {
  failures.push(
    "CHANGELOG.md and README.md disagree on whether this version is published: the Unreleased heading and the README status sentence go together.",
  );
}

if (process.env.RELEASE_TAG !== undefined) {
  if (process.env.RELEASE_TAG !== `v${version}`) {
    failures.push(
      `The release tag ${process.env.RELEASE_TAG} is not v${version}, the version of every package.`,
    );
  }

  if (unreleasedChangelog || unpublishedReadme) {
    failures.push(
      "A release still carries the unpublished placeholders: date the CHANGELOG.md entry and replace the README.md status sentence.",
    );
  }
}

if (!changelog.includes(`## [${version}]`)) {
  failures.push(`CHANGELOG.md has no entry for ${version}.`);
}

if (!changelog.includes(`[${version}]: https://github.com/priemskiyyy/frame`)) {
  failures.push(`CHANGELOG.md has no link reference for ${version}.`);
}

for (const { directory, manifest } of packages) {
  const name = manifest.name;

  const expect = (condition, message) => {
    if (!condition) {
      failures.push(`${name}: ${message}`);
    }
  };

  expect(
    manifest.version === version,
    `version ${manifest.version} is not ${version}.`,
  );
  expect(manifest.license === "MIT", "license is not MIT.");
  expect(manifest.type === "module", "is not ESM only.");
  expect(manifest.sideEffects === false, "has side effects.");
  expect(
    manifest.publishConfig?.access === "public",
    "is not published publicly.",
  );
  expect(
    manifest.repository?.directory === directory,
    `repository.directory is not ${directory}.`,
  );
  expect(
    manifest.repository?.url === "git+https://github.com/priemskiyyy/frame.git",
    "repository.url is wrong.",
  );
  expect(
    manifest.homepage ===
      `https://github.com/priemskiyyy/frame/tree/main/${directory}#readme`,
    "homepage is not the package's README on main.",
  );
  expect(
    manifest.bugs?.url === "https://github.com/priemskiyyy/frame/issues",
    "bugs.url is wrong.",
  );
  expect(
    typeof manifest.description === "string" &&
      manifest.description.length > 20,
    "has no description.",
  );
  expect(
    Array.isArray(manifest.keywords) && manifest.keywords.length > 0,
    "has no keywords.",
  );
  expect(manifest.dependencies === undefined, "has runtime dependencies.");
  expect(
    JSON.stringify(manifest.files) ===
      JSON.stringify(["dist", "README.md", "LICENSE"]),
    "files is not dist, README.md and LICENSE.",
  );
  expect(
    existsSync(path.join(workspace, directory, "README.md")),
    "has no README.md.",
  );
  expect(
    existsSync(path.join(workspace, directory, "LICENSE")) &&
      read(`${directory}/LICENSE`) === license,
    "LICENSE differs from the repository's.",
  );

  for (const [entry, target] of Object.entries(manifest.exports)) {
    expect(
      Object.keys(target).join() === "types,import,default" &&
        target.import === target.default,
      `export ${entry} is not types, import, default on one ESM file.`,
    );
  }

  if (directory !== "packages/core") {
    expect(
      manifest.peerDependencies?.["@priemskiyyy/frame"] === expectedPeer,
      `the peer range of @priemskiyyy/frame is not ${expectedPeer}.`,
    );
    expect(
      manifest.devDependencies?.["@priemskiyyy/frame"] === "workspace:*",
      "@priemskiyyy/frame is not a workspace dev dependency.",
    );
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `${packages.length} packages agree on version ${version}, the changelog and their manifests.`,
);

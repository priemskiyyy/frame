import { defineConfig } from "tsdown";

const entry = [
  "src/index.ts",
  "src/adapter.ts",
  "src/mock.ts",
  "src/testing.ts",
];

export default defineConfig([
  {
    entry,
    format: ["esm"],
    target: "es2022",
    platform: "neutral",
    dts: false,
    clean: true,
    sourcemap: true,
  },
  {
    entry,
    format: ["esm"],
    platform: "neutral",
    dts: { emitDtsOnly: true },
    clean: false,
    sourcemap: false,
  },
]);

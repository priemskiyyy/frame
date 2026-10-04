import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    target: "es2022",
    platform: "neutral",
    dts: false,
    clean: true,
    sourcemap: true,
  },
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    platform: "neutral",
    dts: { emitDtsOnly: true },
    clean: false,
    sourcemap: false,
  },
]);

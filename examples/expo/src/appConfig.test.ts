import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

import { PREVIEW_FAMILY_IDS } from "src/utils/constants/previewFamilies";
import { streakWidget } from "src/widgets/streak/streakWidget";

type AppConfig = {
  expo: {
    ios: { bundleIdentifier: string };
    plugins: [
      string,
      {
        bundleIdentifier: string;
        groupIdentifier: string;
        widgets: { name: string; supportedFamilies: string[] }[];
      },
    ][];
  };
};

const config: AppConfig = JSON.parse(
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../app.json"),
    "utf8",
  ),
);

const [, widgets] = config.expo.plugins.filter(
  ([name]) => name === "expo-widgets",
)[0] ?? ["", undefined];

test("the app installs exactly one widget, and it is the widget the app defines", () => {
  expect(widgets?.widgets.map(({ name }) => name)).toEqual([streakWidget.name]);
});

test("the families the native side supports are exactly the families the preview draws", () => {
  expect([...(widgets?.widgets[0]?.supportedFamilies ?? [])].sort()).toEqual(
    [...PREVIEW_FAMILY_IDS].sort(),
  );
});

test("the widget extension and its App Group are named after the app", () => {
  expect(widgets?.bundleIdentifier).toBe(
    `${config.expo.ios.bundleIdentifier}.widgets`,
  );
  expect(widgets?.groupIdentifier).toBe(
    `group.${config.expo.ios.bundleIdentifier}`,
  );
});

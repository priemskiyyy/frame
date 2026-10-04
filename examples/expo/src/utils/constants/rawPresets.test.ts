import { expect, test } from "vitest";

import { createMockStreakFrame } from "src/frames/createMockStreakFrame.fixture";
import { RAW_PRESETS } from "src/utils/constants/rawPresets";
import { parseStreakJson } from "src/utils/parseStreakJson";

const publishPreset = async (id: string) => {
  const { frame, control } = createMockStreakFrame();
  const preset = RAW_PRESETS.find((candidate) => candidate.id === id);
  const parsed = parseStreakJson(preset?.text ?? "");

  if (parsed.status === "malformed") {
    throw new Error(`The ${id} preset is not JSON.`);
  }

  return {
    outcome: await frame.widget("streak").publish(parsed.value),
    control,
  };
};

test("the valid preset is published", async () => {
  const { outcome, control } = await publishPreset("valid");

  expect(outcome.status).toBe("submitted");
  expect(control.calls()).toHaveLength(1);
});

test("negative days and a wrong type are refused by the schema, naming the field", async () => {
  for (const id of ["negative", "wrong-type"]) {
    const { outcome } = await publishPreset(id);

    expect(outcome).toMatchObject({
      status: "invalid",
      reason: "schema-rejected",
      issues: [{ path: "days" }],
    });
  }
});

test("an extra field is refused because the schema would strip it, naming the field", async () => {
  const { outcome } = await publishPreset("extra-field");

  expect(outcome).toMatchObject({
    status: "invalid",
    reason: "changed-value",
    issues: [{ path: "note" }],
  });
});

test("a missing field is refused by the schema", async () => {
  const { outcome } = await publishPreset("missing-field");

  expect(outcome).toMatchObject({
    status: "invalid",
    reason: "schema-rejected",
  });
});

test("a value that is not a record is refused", async () => {
  const { outcome } = await publishPreset("not-a-record");

  expect(outcome.status).toBe("invalid");
});

test("every refusal stops before the provider", async () => {
  for (const { id } of RAW_PRESETS.filter(({ id }) => id !== "valid")) {
    const { control } = await publishPreset(id);

    expect(control.calls()).toEqual([]);
  }
});

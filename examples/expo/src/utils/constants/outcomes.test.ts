import { expect, test } from "vitest";

import { OUTCOME_LABELS, OUTCOME_ORDER } from "src/utils/constants/outcomes";

test("the legend lists every status Frame can answer, once each", () => {
  expect([...OUTCOME_ORDER].sort()).toEqual(Object.keys(OUTCOME_LABELS).sort());
  expect(new Set(OUTCOME_ORDER).size).toBe(OUTCOME_ORDER.length);
});

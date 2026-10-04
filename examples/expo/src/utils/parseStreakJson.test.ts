import { expect, test } from "vitest";

import { parseStreakJson } from "src/utils/parseStreakJson";

test("text that is JSON is parsed as it is, valid or not", () => {
  expect(parseStreakJson('{"state":"empty"}')).toEqual({
    status: "parsed",
    value: { state: "empty" },
  });
  expect(parseStreakJson("[1,2,3]")).toEqual({
    status: "parsed",
    value: [1, 2, 3],
  });
});

test("text that is not JSON is malformed and says why, so nothing is sent", () => {
  const parsed = parseStreakJson('{"state":');

  expect(parsed.status).toBe("malformed");
  expect(parsed.status === "malformed" && parsed.message).not.toBe("");
});

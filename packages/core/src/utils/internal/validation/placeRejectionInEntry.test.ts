import { expect, test } from "vitest";
import { placeRejectionInEntry } from "src/utils/internal/validation/placeRejectionInEntry";

test("an issue at the root of an entry's data is named by the entry's data", () => {
  expect(
    placeRejectionInEntry(
      {
        status: "rejected",
        reason: "not-transportable",
        issues: [{ path: "", message: "no" }],
      },
      2,
    ),
  ).toEqual({
    status: "rejected",
    reason: "not-transportable",
    issues: [{ path: "entries[2].data", message: "no" }],
  });
});

test("an issue below the data keeps its own path after the entry's", () => {
  expect(
    placeRejectionInEntry(
      {
        status: "rejected",
        reason: "schema-rejected",
        issues: [
          { path: "days", message: "a" },
          { path: "items[1].label", message: "b" },
        ],
      },
      0,
    ).issues,
  ).toEqual([
    { path: "entries[0].data.days", message: "a" },
    { path: "entries[0].data.items[1].label", message: "b" },
  ]);
});

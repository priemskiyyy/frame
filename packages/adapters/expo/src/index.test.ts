import { expect, test } from "vitest";

import * as api from "src/index";

test("the public entry exports exactly these runtime names", () => {
  expect(Object.keys(api)).toEqual(["expoWidget"]);
});

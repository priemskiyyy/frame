import type { MockPlan } from "src/mock/types/MockPlan";

/** How a call ends: a plan that is not `hold`, or the test finishing a held call. */
export type MockResolution = Exclude<MockPlan, { outcome: "hold" }>;

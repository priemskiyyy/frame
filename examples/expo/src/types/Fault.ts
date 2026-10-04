import type { MockPlan } from "@priemskiyyy/frame/mock";

/** One way a provider call can go wrong: what the button says, what the page says after it is armed, and what the mock does. */
export type Fault = {
  id: string;
  label: string;
  note: string;
  plan: MockPlan;
};

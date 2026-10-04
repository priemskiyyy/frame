import type { RequestFailure } from "src/types/RequestFailure";

export const getUnsupportedFailure = (
  adapter: { name: string },
  method: "publishTimeline" | "reload" | "readback",
): RequestFailure => ({
  status: "unavailable",
  reason: `The ${adapter.name} adapter does not provide ${method}.`,
  remediation: null,
});

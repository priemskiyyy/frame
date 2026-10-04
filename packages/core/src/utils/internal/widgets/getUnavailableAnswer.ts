import type { Refusal } from "src/types/internal/Refusal";

export const getUnavailableAnswer = (key: string, refusals: Refusal[]) => {
  const [only] = refusals;

  if (only === undefined) {
    return {
      reason: `Nothing hosts "${key}" here: no adapter was given for it.`,
      remediation: "Pass an adapter for this platform in `adapters`.",
    };
  }

  if (refusals.length === 1) {
    return { reason: only.reason, remediation: only.remediation };
  }

  const remediations = refusals.flatMap(({ adapter, remediation }) => {
    if (remediation === null) {
      return [];
    }

    return [`${adapter.name}: ${remediation}`];
  });

  return {
    reason: refusals
      .map(({ adapter, reason }) => `${adapter.name}: ${reason}`)
      .join(" "),
    remediation: remediations.length === 0 ? null : remediations.join(" "),
  };
};

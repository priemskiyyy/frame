import type { FrameLimits } from "src/types/FrameLimits";

/** The resource guardrails of a Frame that sets none. They are Frame's policy, not a provider's. */
export const DEFAULT_LIMITS = Object.freeze({
  depth: 64,
  nodes: 50_000,
  bytes: 262_144,
  entries: 64,
} satisfies FrameLimits);

/** Milliseconds a provider call may take before its request ends indeterminate. */
export const DEFAULT_TIMEOUT = 5_000;

/** The largest delay a host timer holds, in milliseconds: a longer one fires at once in most hosts, so a longer `timeout` would end every call early. */
export const MAX_TIMEOUT = 2_147_483_647;

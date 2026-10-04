/** The demo schedule: the streak as it is now, then one more day a minute apart, with no app running. */
export const SCHEDULE_STEPS = [
  { afterMs: 0, extraDays: 0 },
  { afterMs: 60_000, extraDays: 1 },
  { afterMs: 120_000, extraDays: 2 },
];

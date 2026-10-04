/**
 * How the next call of a mock session ends, as `succeed`, `skip`, `fail`,
 * `indeterminate`, `throw` or `hold`. Each variant says what the simulated
 * provider then holds.
 *
 * @example
 * ```ts
 * control.script({ outcome: "indeterminate", stored: true }, { outcome: "succeed" });
 * ```
 */
export type MockPlan =
  /** Answers `simulated` evidence and stores what it was given. */
  | { outcome: "succeed" }
  /** Answers that no widget is placed. */
  | { outcome: "skip" }
  /** Answers that nothing reached the provider. */
  | { outcome: "fail"; error?: Error | undefined }
  /** Answers that effects are unknown; with `stored` true they landed anyway. */
  | {
      outcome: "indeterminate";
      error?: Error | undefined;
      stored?: boolean | undefined;
    }
  /** Rejects; with `stored` true the effect landed anyway. */
  | { outcome: "throw"; error: Error; stored?: boolean | undefined }
  /** Waits for the test, as a provider that has not answered. */
  | { outcome: "hold" };

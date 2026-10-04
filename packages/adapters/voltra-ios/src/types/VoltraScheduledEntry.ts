import type { VoltraWidgetVariants } from "src/types/VoltraWidgetVariants";

/**
 * One entry of a Voltra schedule: the content to show from `date` on. It
 * mirrors the SDK's `ScheduledWidgetEntry` without its deep link.
 *
 * @example
 * ```tsx
 * const entry: VoltraScheduledEntry = {
 *   date: new Date(1_000),
 *   variants: { systemSmall: <Voltra.Text>12 days</Voltra.Text> },
 * };
 * ```
 */
export type VoltraScheduledEntry = {
  date: Date;
  variants: VoltraWidgetVariants;
};

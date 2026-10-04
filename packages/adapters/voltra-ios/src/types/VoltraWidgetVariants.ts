import type { ReactNode } from "react";

import type { VoltraWidgetFamily } from "src/types/VoltraWidgetFamily";

/**
 * Voltra JSX for each family a widget supports. A family left out falls back
 * to another one on the device; Frame does not check coverage.
 *
 * @example
 * ```tsx
 * const variants: VoltraWidgetVariants = {
 *   systemSmall: <Voltra.Text>12 days</Voltra.Text>,
 * };
 * ```
 */
export type VoltraWidgetVariants = Partial<
  Record<VoltraWidgetFamily, ReactNode>
>;

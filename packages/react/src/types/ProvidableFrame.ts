import type { Frame, Widgets } from "@priemskiyyy/frame";

import type { RegisteredWidgets } from "src/types/Register";

type OtherWidgets = {
  "The Frame has widgets that are not the registered Frame's: same names, same data. Register this Frame, or give the provider the registered one.": never;
};

/**
 * What a Frame must be to be given to `FrameProvider`: one whose widgets are
 * the registered ones, by name and by data. A Frame is not checked for this by
 * its class type alone, so the widgets are compared here.
 *
 * @example
 * ```ts
 * type Checked = ProvidableFrame<typeof frame>;
 * ```
 */
export type ProvidableFrame<TFrame> =
  TFrame extends Frame<infer TProvided extends Widgets>
    ? [TProvided] extends [RegisteredWidgets]
      ? TFrame
      : OtherWidgets
    : OtherWidgets;

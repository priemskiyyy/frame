import type { JsonRecord } from "src/types/JsonRecord";
import type { ObservableValue } from "src/types/ObservableValue";
import type { PublicationOutcome } from "src/types/PublicationOutcome";
import type { PublishOptions } from "src/types/PublishOptions";
import type { ReadbackOutcome } from "src/types/ReadbackOutcome";
import type { ReloadOutcome } from "src/types/ReloadOutcome";
import type { TimelineEntry } from "src/types/TimelineEntry";
import type { WidgetStatus } from "src/types/WidgetStatus";

/**
 * One widget in one context, the same on every platform: reading it starts
 * nothing, and every request answers an outcome and never rejects. A handle of
 * a retired context never follows the next one, and a method the hosting
 * adapter lacks answers `unavailable`.
 *
 * @example
 * ```ts
 * const widget = frame.widget("streak");
 * const outcome = await widget.publish({ days: 12 });
 * widget.get();
 * ```
 */
export type WidgetHandle<TData extends JsonRecord> = {
  /** The value Frame wants shown, frozen, not the host's pixels; `null` before one is accepted and after retirement. */
  get: () => TData | null;
  /** Notifies when `get` changes. */
  subscribe: (listener: () => void) => () => void;
  status: ObservableValue<WidgetStatus>;
  /** Replaces the widget's content with `data`. Never rejects. */
  publish: (
    data: TData,
    options?: PublishOptions,
  ) => Promise<PublicationOutcome>;
  /** Replaces the whole schedule at once. The first entry must not be in the future, and `get` is the latest entry that is not. Never rejects. */
  publishTimeline: (
    entries: TimelineEntry<TData>[],
    options?: PublishOptions,
  ) => Promise<PublicationOutcome>;
  /** Replaces the widget's content with its fallback. Never rejects. */
  reset: (options?: PublishOptions) => Promise<PublicationOutcome>;
  /** Asks the host to redraw. It acknowledges the request, never a render. */
  reload: () => Promise<ReloadOutcome>;
  /** Reads back what the provider stores, parsed with the definition's schema. */
  readback: () => Promise<ReadbackOutcome<TData>>;
};

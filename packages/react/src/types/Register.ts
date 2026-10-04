import type { Frame, WidgetData, WidgetKey, Widgets } from "@priemskiyyy/frame";

/**
 * Declaration-merging target that types every hook of this package with the
 * application's Frame. Augment it once, next to the Frame:
 *
 * @example
 * ```ts
 * declare module "@priemskiyyy/frame-react" {
 *   interface Register {
 *     frame: typeof frame;
 *   }
 * }
 * ```
 */
export interface Register {}

/** The Frame an unregistered package accepts. The marker property exists on no Frame, so registration cannot be forgotten on any TypeScript version. */
type UnregisteredFrame = {
  "~register": "Augment Register in @priemskiyyy/frame-react with your Frame.";
} & Frame;

/**
 * The registered Frame. Unregistered, it is a Frame that no real Frame can be
 * assigned to, so the provider refuses until `Register` names yours.
 *
 * @example
 * ```ts
 * const frame: RegisteredFrame = useFrame();
 * ```
 */
export type RegisteredFrame = Register extends { frame: infer TFrame }
  ? TFrame
  : UnregisteredFrame;

/** The widgets of the registered Frame. */
export type RegisteredWidgets =
  RegisteredFrame extends Frame<infer TWidgets extends Widgets>
    ? TWidgets
    : never;

/**
 * The names the registered Frame's widgets go by.
 *
 * @example
 * ```ts
 * const key: RegisteredKey = "streak";
 * ```
 */
export type RegisteredKey = WidgetKey<RegisteredWidgets>;

/**
 * The data of one registered widget.
 *
 * @example
 * ```ts
 * const data: RegisteredData<"streak"> = { days: 12 };
 * ```
 */
export type RegisteredData<TKey extends RegisteredKey> = WidgetData<
  RegisteredWidgets[TKey]
>;

import type { JSX } from "react";

/**
 * What a render function answers: one tree built from the SDK's widget
 * primitives, or a light tree with a dark one. For light only, answer the tree
 * itself: the SDK's own type allows `dark: null`, but its implementation throws
 * on it, so this type does not.
 *
 * @example
 * ```tsx
 * const light: WidgetRepresentationLike = <TextWidget text="12 days" />;
 * const both: WidgetRepresentationLike = { light, dark: <TextWidget text="12 days" /> };
 * ```
 */
export type WidgetRepresentationLike =
  JSX.Element | { light: JSX.Element; dark: JSX.Element };

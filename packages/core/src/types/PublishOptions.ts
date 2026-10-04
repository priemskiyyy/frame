/**
 * Options of `publish`, `reset` and `publishTimeline`.
 *
 * @example
 * ```ts
 * await widget.publish(data, { force: true });
 * ```
 */
export type PublishOptions = {
  /**
   * Sends identical content again instead of answering `unchanged`. Use it
   * after something outside Frame changed the native widget. It buys no extra
   * display opportunity from the host.
   */
  force?: boolean | undefined;
};

/**
 * Yields twenty microtask turns, so the promises that are ready run and a test
 * can look between two steps. A chain longer than that, a timer or an I/O wait
 * is not waited for.
 *
 * @example
 * ```ts
 * const stuck = widget.publish({ days: 1 });
 *
 * await settle();
 *
 * control.held()[0]?.release();
 * ```
 */
export const settle = async () => {
  for (let turn = 0; turn < 20; turn += 1) {
    await Promise.resolve();
  }
};

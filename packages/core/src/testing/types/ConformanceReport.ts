/**
 * What a conformance suite answers when every check that applies passed: the
 * names of those checks, and of the ones that do not apply to what the subject
 * provides, such as an operation check for an adapter without that operation. A
 * failing check throws instead.
 *
 * @example
 * ```ts
 * const { passed, skipped } = await testWidgetAdapter(harness);
 * ```
 */
export type ConformanceReport = {
  passed: string[];
  skipped: string[];
};

// An error from another realm, such as a WebView, is not an `instanceof` this realm's `Error`.
export const isError = <TThrown>(thrown: TThrown): thrown is TThrown & Error =>
  thrown instanceof Error ||
  Object.prototype.toString.call(thrown) === "[object Error]";

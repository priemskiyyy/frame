export type RenderAttempt<TRendered> =
  | { status: "rendered"; rendered: TRendered }
  | { status: "failed"; error: Error };

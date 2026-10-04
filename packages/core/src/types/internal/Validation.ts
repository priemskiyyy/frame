import type { Rejection } from "src/types/internal/Rejection";

/** A schema's verdict: the owned, frozen value it accepted, or why it refused. */
export type Validation<TData> =
  { status: "valid"; snapshot: TData } | Rejection;

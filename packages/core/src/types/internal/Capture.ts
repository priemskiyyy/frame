import type { Rejection } from "src/types/internal/Rejection";

/** A value's canonical wire text: sorted keys, no whitespace, no `undefined`, and `-0` as `0`. */
export type Capture = { status: "captured"; canonical: string } | Rejection;

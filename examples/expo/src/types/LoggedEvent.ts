import type { FrameDiagnosticEvent } from "@priemskiyyy/frame";

/** One event Frame reported, with the number it was logged under so a list can key it. */
export type LoggedEvent = { id: number; event: FrameDiagnosticEvent };

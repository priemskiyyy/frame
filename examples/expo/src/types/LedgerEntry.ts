import type { PublicationOutcome } from "@priemskiyyy/frame";

import type { Provider } from "src/types/Provider";

/** One thing the page asked of Frame, and what Frame answered. */
export type LedgerEntry = {
  id: number;
  label: string;
  provider: Provider;
  outcome: PublicationOutcome;
  at: number;
};

import type { JsonRecord } from "src/types/JsonRecord";
import type { PublicationOutcome } from "src/types/PublicationOutcome";
import type { ReadbackOutcome } from "src/types/ReadbackOutcome";
import type { ReloadOutcome } from "src/types/ReloadOutcome";

/** Every status a request of any kind can end with. */
export type RequestStatus =
  | PublicationOutcome["status"]
  | ReloadOutcome["status"]
  | ReadbackOutcome<JsonRecord>["status"];

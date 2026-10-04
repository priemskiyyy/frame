import type { InvalidIssue } from "src/types/InvalidIssue";
import type { InvalidReason } from "src/types/InvalidReason";

export type Rejection = {
  status: "rejected";
  reason: InvalidReason;
  issues: InvalidIssue[];
};

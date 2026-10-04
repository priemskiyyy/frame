import type React from "react";
import type { PublicationOutcome } from "@priemskiyyy/frame";

import { Badge } from "src/components/Badge/Badge";
import { OUTCOME_LABELS, OUTCOME_TONES } from "src/utils/constants/outcomes";

type OutcomeBadgeProps = {
  status: PublicationOutcome["status"];
};

export const OutcomeBadge: React.FunctionComponent<OutcomeBadgeProps> = ({
  status,
}) => <Badge tone={OUTCOME_TONES[status]}>{OUTCOME_LABELS[status]}</Badge>;

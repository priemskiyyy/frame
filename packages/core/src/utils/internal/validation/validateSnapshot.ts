import type { FrameLimits } from "src/types/FrameLimits";
import type { Rejection } from "src/types/internal/Rejection";
import type { Validation } from "src/types/internal/Validation";
import type { JsonRecord } from "src/types/JsonRecord";
import type { StandardSchemaResult } from "src/types/StandardSchemaResult";
import type { WidgetDefinition } from "src/types/WidgetDefinition";
import { captureSnapshot } from "src/utils/internal/transport/captureSnapshot";
import { createSnapshot } from "src/utils/internal/transport/createSnapshot";
import { findChangedPaths } from "src/utils/internal/validation/findChangedPaths";
import { formatIssuePath } from "src/utils/internal/validation/formatIssuePath";

const CHANGED_MESSAGE =
  "The schema changed this value. Frame publishes a value unchanged: shape it before you publish.";

const CHANGED_VALUE: Rejection = Object.freeze({
  status: "rejected",
  reason: "changed-value",
  issues: [{ path: "", message: CHANGED_MESSAGE }],
});

const SCHEMA_THREW: Rejection = Object.freeze({
  status: "rejected",
  reason: "schema-threw",
  issues: [{ path: "", message: "The schema threw instead of answering." }],
});

/**
 * Asks the definition's schema about a captured value. The schema sees an
 * owned, frozen copy, and what it accepts must equal what it was given: Frame
 * publishes the value, never a transformation of it. Answers synchronously
 * when the schema does.
 */
export const validateSnapshot = <TData extends JsonRecord>(
  definition: WidgetDefinition<string, TData>,
  canonical: string,
  limits: Pick<FrameLimits, "depth" | "nodes" | "bytes">,
): Validation<TData> | Promise<Validation<TData>> => {
  const snapshot = createSnapshot<TData>(canonical);

  const judge = (result: StandardSchemaResult<TData>): Validation<TData> => {
    if (result.issues !== undefined) {
      return {
        status: "rejected",
        reason: "schema-rejected",
        issues: [...result.issues].map((issue) => ({
          path: formatIssuePath(issue.path),
          message: issue.message,
        })),
      };
    }

    const captured = captureSnapshot(result.value, limits);

    if (captured.status === "rejected") {
      return CHANGED_VALUE;
    }

    if (captured.canonical === canonical) {
      return { status: "valid", snapshot };
    }

    return {
      status: "rejected",
      reason: "changed-value",
      issues: findChangedPaths(
        snapshot,
        createSnapshot<TData>(captured.canonical),
      ).map((path) => ({ path, message: CHANGED_MESSAGE })),
    };
  };

  try {
    const answer = definition.schema["~standard"].validate(snapshot);

    if ("then" in answer) {
      return answer.then(judge).catch(() => SCHEMA_THREW);
    }

    return judge(answer);
  } catch {
    return SCHEMA_THREW;
  }
};

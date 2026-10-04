import type { ReadbackAnswer } from "src/types/ReadbackAnswer";
import { getInvalidAnswer } from "src/utils/internal/widgets/getInvalidAnswer";

// An answer outside the contract throws, which the lane reads as an indeterminate call.
export const checkReadbackAnswer = (answer: ReadbackAnswer) => {
  if (answer === null || typeof answer !== "object") {
    throw getInvalidAnswer(answer);
  }

  if (answer.status === "failed") {
    return answer;
  }

  if (answer.status === "read" && Array.isArray(answer.entries)) {
    return answer;
  }

  throw getInvalidAnswer(answer);
};

import { FrameError } from "src/utils/FrameError";

export const getInvalidAnswer = <TAnswer>(answer: TAnswer) => {
  let printed = "a value that cannot be printed";

  try {
    printed = JSON.stringify(answer);
  } catch {
    // The answer is already known to be wrong; only its printing failed.
  }

  return new FrameError({
    code: "INVALID_ANSWER",
    message: `An adapter answered ${printed}, which is not an answer of its contract.`,
  });
};

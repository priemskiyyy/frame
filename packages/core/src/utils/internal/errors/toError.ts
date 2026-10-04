import { isError } from "src/utils/internal/errors/isError";
import { FrameError } from "src/utils/FrameError";

export const toError = <TThrown>(thrown: TThrown) => {
  if (isError(thrown)) {
    return thrown;
  }

  return new FrameError({
    code: "PROVIDER_FAILED",
    message: "A provider threw a value that is not an Error.",
  });
};

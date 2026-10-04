import type { RenderAttempt } from "src/types/internal/RenderAttempt";
import { RENDER_THREW_NON_ERROR_MESSAGE } from "src/utils/constants/errors";

export const attemptRender = <TRendered>(
  render: () => TRendered,
): RenderAttempt<TRendered> => {
  try {
    return { status: "rendered", rendered: render() };
  } catch (thrown) {
    if (thrown instanceof Error) {
      return { status: "failed", error: thrown };
    }

    return {
      status: "failed",
      error: new Error(RENDER_THREW_NON_ERROR_MESSAGE),
    };
  }
};

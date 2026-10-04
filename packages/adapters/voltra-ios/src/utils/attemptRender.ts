import type { RenderAttempt } from "src/types/internal/RenderAttempt";
import { NOT_AN_ERROR_MESSAGE } from "src/utils/constants/render";

export const attemptRender = <TRendered>(
  render: () => TRendered,
): RenderAttempt<TRendered> => {
  try {
    return { status: "rendered", rendered: render() };
  } catch (thrown) {
    if (thrown instanceof Error) {
      return { status: "failed", error: thrown };
    }

    return { status: "failed", error: new Error(NOT_AN_ERROR_MESSAGE) };
  }
};

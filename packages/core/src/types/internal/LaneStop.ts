/**
 * How the lane ended a task short of an answer.
 *
 * - `threw`: the call threw or rejected.
 * - `timeout`: the call outlived its deadline. The lane is blocked until it answers.
 * - `abandoned`: the lane was disposed while the call was in flight.
 * - `blocked`: the lane refused the task, because an earlier call has not answered.
 * - `disposed`: the lane was disposed while the task waited, or before it arrived.
 */
export type LaneStop =
  | { status: "threw"; error: Error }
  | { status: "timeout" }
  | { status: "abandoned" }
  | { status: "blocked" }
  | { status: "disposed" };

import type { DiagnosticEventInput } from "src/types/internal/DiagnosticEventInput";
import type { LaneStop } from "src/types/internal/LaneStop";
import type { LaneTask } from "src/types/internal/LaneTask";
import type { FrameClock } from "src/types/FrameClock";
import { Listeners } from "src/utils/common/Listeners";
import { isolate } from "src/utils/common/isolate";
import { toError } from "src/utils/internal/errors/toError";

type RunningTask = {
  task: LaneTask;
  cancelTimer: () => void;
  hung: boolean;
};

export class Lane {
  #name: string;
  #clock: FrameClock;
  #timeout: number;
  #emit: (build: () => DiagnosticEventInput) => void;
  #queue: LaneTask[] = [];
  #running: RunningTask | null = null;
  #disposed = false;
  #listeners = new Listeners<() => void>();

  constructor({
    name,
    clock,
    timeout,
    emit,
  }: {
    name: string;
    clock: FrameClock;
    timeout: number;
    emit: (build: () => DiagnosticEventInput) => void;
  }) {
    this.#name = name;
    this.#clock = clock;
    this.#timeout = timeout;
    this.#emit = emit;
  }

  isBlocked = () => this.#running?.hung === true;

  subscribe = this.#listeners.add;

  /** Answers how to take the task back out while it has not started; a task the lane refused is already stopped. */
  enqueue = (task: LaneTask): (() => void) => {
    if (this.#disposed) {
      return this.#refuse(task, { status: "disposed" });
    }

    if (this.isBlocked()) {
      return this.#refuse(task, { status: "blocked" });
    }

    this.#queue.push(task);
    this.#notify();
    this.#drain();

    return () => this.#cancel(task);
  };

  dispose = () => {
    this.#disposed = true;

    for (const task of this.#queue.splice(0)) {
      this.#stop(task, { status: "disposed" });
    }

    const running = this.#running;

    this.#running = null;

    if (running !== null) {
      running.cancelTimer();
      this.#abandon(running);
    }

    this.#notify();
  };

  #refuse = (task: LaneTask, stop: LaneStop) => {
    this.#stop(task, stop);

    return () => {};
  };

  #cancel = (task: LaneTask) => {
    const index = this.#queue.indexOf(task);

    if (index === -1) {
      return;
    }

    this.#queue.splice(index, 1);
    this.#notify();
  };

  #abandon = (running: RunningTask) => {
    // A hung task already told its caller it timed out.
    if (running.hung) {
      return;
    }

    this.#stop(running.task, { status: "abandoned" });
  };

  #stop = (task: LaneTask, stop: LaneStop) => {
    isolate(() => task.onStop(stop));
  };

  #notify = () => {
    this.#listeners.notify((listener) => listener());
  };

  #drain = () => {
    const task = this.#running === null ? this.#queue.shift() : undefined;

    if (task === undefined) {
      return;
    }

    const running: RunningTask = {
      task,
      hung: false,
      cancelTimer: this.#clock.setTimer(
        () => this.#expire(running),
        this.#timeout,
      ),
    };

    this.#running = running;
    this.#notify();

    this.#call(task).then(
      () => this.#answer(running, "answered"),
      (error) =>
        this.#answer(running, { status: "threw", error: toError(error) }),
    );
  };

  // A call that throws before returning a promise is a rejected call.
  #call = (task: LaneTask) => {
    try {
      return task.start();
    } catch (error) {
      return Promise.reject(error);
    }
  };

  #answer = (
    running: RunningTask,
    ending: "answered" | Extract<LaneStop, { status: "threw" }>,
  ) => {
    if (this.#running !== running) {
      return;
    }

    running.cancelTimer();
    this.#running = null;
    this.#notify();
    this.#report(running, ending);
    this.#drain();
  };

  #report = (
    running: RunningTask,
    ending: "answered" | Extract<LaneStop, { status: "threw" }>,
  ) => {
    if (!running.hung) {
      if (ending !== "answered") {
        this.#stop(running.task, ending);
      }

      return;
    }

    this.#emit(() => ({
      type: "write-domain-unblocked",
      writeDomain: { name: this.#name },
      result: { status: ending === "answered" ? "answered" : ending.status },
    }));
  };

  #expire = (running: RunningTask) => {
    running.hung = true;
    this.#stop(running.task, { status: "timeout" });

    // Whoever heard the timeout may have disposed the Frame.
    if (this.#disposed) {
      return;
    }

    for (const task of this.#queue.splice(0)) {
      this.#stop(task, { status: "blocked" });
    }

    this.#notify();
    this.#emit(() => ({
      type: "write-domain-blocked",
      writeDomain: { name: this.#name },
    }));
  };
}

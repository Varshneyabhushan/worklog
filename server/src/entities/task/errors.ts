import type { TaskStatus } from "./status";

export class TaskInvariantError extends Error {
   constructor(
      message: string,
      readonly field: string,
      readonly value?: unknown,
   ) {
      super(message);
      this.name = new.target.name;
   }
}

export class InvalidStatusTransitionError extends TaskInvariantError {
   constructor(
      readonly from: TaskStatus,
      readonly to: TaskStatus,
   ) {
      super(`a task cannot move from ${from} to ${to}`, "status", to);
   }
}

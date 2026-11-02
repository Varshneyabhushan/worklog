import { ConflictError, InvariantError } from "../../utils/errors";
import type { TaskStatus } from "./status";

export class TaskInvariantError extends InvariantError {}

export class InvalidStatusTransitionError extends TaskInvariantError {
   constructor(
      readonly from: TaskStatus,
      readonly to: TaskStatus,
   ) {
      super(`a task cannot move from ${from} to ${to}`, "status", to);
   }
}

export class TaskUndoError extends ConflictError {}

import { ConflictError, NotFoundError } from "../../utils/errors";

export class TaskNotFoundError extends NotFoundError {
   constructor(readonly id: string) {
      super(`no task ${id}`);
   }
}

export class TaskParentNotFoundError extends NotFoundError {
   constructor(readonly parentId: string) {
      super(`no parent task ${parentId}`);
   }
}

export class TaskSourceKeyTakenError extends ConflictError {
   constructor(
      readonly sourceKey: string,
      readonly takenBy: string,
   ) {
      super(`source key ${sourceKey} already belongs to ${takenBy}`);
   }
}

export class TaskNestingError extends ConflictError {}

export class TaskNotReopenableError extends ConflictError {
   constructor(readonly id: string) {
      super(`${id} is still open; only a done or dropped task can be reopened`);
   }
}

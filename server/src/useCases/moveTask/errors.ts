import { InvalidInputError } from "../../utils/errors";

export class InvalidMoveTaskInputError extends InvalidInputError {}

import { ConflictError } from "../../utils/errors";

export class TaskAwaitsReviewError extends ConflictError {
   constructor(readonly id: string) {
      super(`${id} is in review; only you can decide it, from the board`);
   }
}

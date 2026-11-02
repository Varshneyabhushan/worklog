import { InvalidInputError } from "../../utils/errors";

export class InvalidDecideReviewInputError extends InvalidInputError {}

import { ConflictError } from "../../utils/errors";

export class TaskNotInReviewError extends ConflictError {
   constructor(readonly id: string) {
      super(`${id} is not in review`);
   }
}

import { NotFoundError } from "../../utils/errors";

export class DayNoteNotFoundError extends NotFoundError {
   constructor(readonly id: number) {
      super(`no day note ${id}`);
   }
}

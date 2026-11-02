import { NotFoundError } from "../../utils/errors";

export class MeetingNotFoundError extends NotFoundError {
   constructor(readonly id: number) {
      super(`no meeting ${id}`);
   }
}

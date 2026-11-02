import { NotFoundError } from "../../utils/errors";

export class UpdateNotFoundError extends NotFoundError {
   constructor(readonly id: number) {
      super(`no update ${id}`);
   }
}

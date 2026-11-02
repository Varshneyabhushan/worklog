import { ConflictError, InvalidInputError } from "../../utils/errors";

export class InvalidSignOffDayInputError extends InvalidInputError {}

export class ReportNotGeneratedError extends ConflictError {
   constructor(readonly path: string) {
      super(`${path} was not written by this service; refusing to overwrite it`);
   }
}

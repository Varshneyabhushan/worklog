import { UPDATE_AUTHORS, type UpdateProps } from ".";
import { UpdateInvariantError } from "./errors";

const MAX_BODY = 20_000;

export function assertValidBody(body: string): void {
   if (body.trim() === "") throw new UpdateInvariantError("an update needs a body", "body", body);
   if (body.length > MAX_BODY) {
      throw new UpdateInvariantError(
         `an update is at most ${MAX_BODY} characters`,
         "body",
         body.length,
      );
   }
}

export function assertValidAuthor(by: string): void {
   if (!(UPDATE_AUTHORS as readonly string[]).includes(by)) {
      throw new UpdateInvariantError(`unknown author "${by}"`, "by", by);
   }
}

export function assertValidUpdate(update: UpdateProps): void {
   assertValidBody(update.body);
   assertValidAuthor(update.by);
}

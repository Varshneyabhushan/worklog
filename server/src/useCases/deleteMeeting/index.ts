import type { MeetingService } from "../../services/meeting";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidDeleteMeetingInputError } from "./errors";
import { DeleteMeetingSchema } from "./schema";

export default class DeleteMeetingUseCase {
   constructor(
      private readonly meetings: MeetingService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<{ id: number }> {
      const { id } = parseInput(DeleteMeetingSchema, input, InvalidDeleteMeetingInputError);
      this.meetings.delete(id);
      this.ctx.changes.publish({ kind: "meeting", id: String(id) });
      return { id };
   }
}

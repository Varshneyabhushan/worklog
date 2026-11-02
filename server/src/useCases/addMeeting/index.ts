import type { Meeting } from "../../entities/meeting";
import type { MeetingService } from "../../services/meeting";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidAddMeetingInputError } from "./errors";
import { AddMeetingSchema } from "./schema";

export default class AddMeetingUseCase {
   constructor(
      private readonly meetings: MeetingService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<Meeting> {
      const fields = parseInput(AddMeetingSchema, input, InvalidAddMeetingInputError);
      const meeting = this.meetings.add({ ...fields, cancelled: false });
      this.ctx.changes.publish({ kind: "meeting", id: String(meeting.id) });
      return meeting;
   }
}

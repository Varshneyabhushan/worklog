import type { Meeting } from "../../entities/meeting";
import type { MeetingService, NewMeeting } from "../../services/meeting";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidEditMeetingInputError } from "./errors";
import { EditMeetingSchema } from "./schema";

export default class EditMeetingUseCase {
   constructor(
      private readonly meetings: MeetingService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<Meeting> {
      const { id, ...fields } = parseInput(EditMeetingSchema, input, InvalidEditMeetingInputError);
      const changes = Object.fromEntries(
         Object.entries(fields).filter(([, value]) => value !== undefined),
      ) as Partial<NewMeeting>;
      const meeting = this.meetings.edit(id, changes);
      this.ctx.changes.publish({ kind: "meeting", id: String(id) });
      return meeting;
   }
}

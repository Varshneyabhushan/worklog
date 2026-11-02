import type { Meeting } from "../../entities/meeting";
import type { MeetingService } from "../../services/meeting";
import { dayRange, localDateOf } from "../../utils/dates";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidListMeetingsInputError } from "./errors";
import { ListMeetingsSchema } from "./schema";

export default class ListMeetingsUseCase {
   constructor(
      private readonly meetings: MeetingService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<Meeting[]> {
      const { date } = parseInput(ListMeetingsSchema, input, InvalidListMeetingsInputError);
      const day = date ?? localDateOf(this.ctx.clock.now(), this.ctx.timeZone);
      const { from, to } = dayRange(day, this.ctx.timeZone);
      return this.meetings.startingBetween(from, to);
   }
}

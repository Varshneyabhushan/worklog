import type { Day } from "../../entities/day";
import type { DayService } from "../../services/day";
import { localDateOf } from "../../utils/dates";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidAddDayNoteInputError } from "./errors";
import { AddDayNoteSchema } from "./schema";

export default class AddDayNoteUseCase {
   constructor(
      private readonly days: DayService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<Day> {
      const { body, date } = parseInput(AddDayNoteSchema, input, InvalidAddDayNoteInputError);
      const now = this.ctx.clock.now();
      const day = this.days.addNote(date ?? localDateOf(now, this.ctx.timeZone), body, now);
      this.ctx.changes.publish({ kind: "day", id: day.date });
      return day;
   }
}

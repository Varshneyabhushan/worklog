import type { DayService } from "../../services/day";
import type { LocalDate } from "../../utils/dates";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidDeleteDayNoteInputError } from "./errors";
import { DeleteDayNoteSchema } from "./schema";

export default class DeleteDayNoteUseCase {
   constructor(
      private readonly days: DayService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<{ id: number; date: LocalDate }> {
      const { id } = parseInput(DeleteDayNoteSchema, input, InvalidDeleteDayNoteInputError);
      const date = this.days.deleteNote(id);
      this.ctx.changes.publish({ kind: "day", id: date });
      return { id, date };
   }
}

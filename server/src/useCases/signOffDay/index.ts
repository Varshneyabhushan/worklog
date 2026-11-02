import type { Day } from "../../entities/day";
import type { FileWriter } from "../../integrations/FileSystem";
import { localDateOf } from "../../utils/dates";
import type { UseCaseContext } from "../shared/context";
import { gatherDay, type ActivityServices } from "../shared/dayActivity";
import { parseInput } from "../shared/parseInput";
import { renderReport, renderSummary, reportFilePath } from "../shared/report";
import { InvalidSignOffDayInputError } from "./errors";
import { SignOffDaySchema } from "./schema";

export default class SignOffDayUseCase {
   constructor(
      private readonly services: ActivityServices,
      private readonly files: FileWriter,
      private readonly reportRoot: string,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<{ day: Day; path: string }> {
      const now = this.ctx.clock.now();
      const parsed = parseInput(SignOffDaySchema, input, InvalidSignOffDayInputError);
      const date = parsed.date ?? localDateOf(now, this.ctx.timeZone);

      const activity = gatherDay(this.services, date, this.ctx.timeZone);
      const summary = renderSummary(activity);
      // database first, file after: if the write fails, signing off again rewrites both
      const day = this.services.days.signOff(date, summary, now);
      const path = reportFilePath(this.reportRoot, date);
      this.files.writeAtomic(path, renderReport({ ...activity, day }, summary, this.ctx.timeZone));

      this.ctx.changes.publish({ kind: "day", id: date });
      return { day, path };
   }
}

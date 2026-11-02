import type { Day } from "../../entities/day";
import type { Task } from "../../entities/task";
import type { Update } from "../../entities/update";
import type { UseCaseContext } from "../shared/context";
import { gatherDay, type ActivityServices } from "../shared/dayActivity";
import { parseInput } from "../shared/parseInput";
import { InvalidGetDayInputError } from "./errors";
import { GetDaySchema } from "./schema";

export interface DayView {
   day: Day;
   tasks: Task[];
   doneTaskIds: string[];
   updates: Update[];
}

export default class GetDayUseCase {
   constructor(
      private readonly services: ActivityServices,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<DayView> {
      const { date } = parseInput(GetDaySchema, input, InvalidGetDayInputError);
      const activity = gatherDay(this.services, date, this.ctx.timeZone);
      return {
         day: activity.day,
         tasks: activity.tasks,
         doneTaskIds: [...activity.doneIds],
         updates: [...activity.updatesByTask.values()].flat(),
      };
   }
}

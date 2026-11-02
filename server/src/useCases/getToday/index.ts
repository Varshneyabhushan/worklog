import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { buildToday, type Today, type TodayServices } from "../shared/today";
import { InvalidGetTodayInputError } from "./errors";
import { GetTodaySchema } from "./schema";

export default class GetTodayUseCase {
   constructor(
      private readonly services: TodayServices,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown = {}): Promise<Today> {
      parseInput(GetTodaySchema, input, InvalidGetTodayInputError);
      return buildToday(this.services, this.ctx.clock.now(), this.ctx.timeZone);
   }
}

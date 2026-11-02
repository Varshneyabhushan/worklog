import type { Day } from "../../entities/day";
import type { DayService } from "../../services/day";
import { parseInput } from "../shared/parseInput";
import { InvalidListDaysInputError } from "./errors";
import { ListDaysSchema } from "./schema";

export default class ListDaysUseCase {
   constructor(private readonly days: DayService) {}

   async execute(input: unknown): Promise<Day[]> {
      const { limit, before } = parseInput(ListDaysSchema, input, InvalidListDaysInputError);
      return this.days.list(limit, before ?? null);
   }
}

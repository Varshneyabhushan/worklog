import { compareForPlan, type Task } from "../../entities/task";
import type { TaskService } from "../../services/task";
import { localDateOf } from "../../utils/dates";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidListTasksInputError } from "./errors";
import { ListTasksSchema } from "./schema";

export default class ListTasksUseCase {
   constructor(
      private readonly tasks: TaskService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<Task[]> {
      const filter = parseInput(ListTasksSchema, input, InvalidListTasksInputError);
      const today = localDateOf(this.ctx.clock.now(), this.ctx.timeZone);
      return this.tasks.list(filter).sort((a, b) => compareForPlan(a, b, today));
   }
}

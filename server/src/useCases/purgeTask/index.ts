import type { TaskService } from "../../services/task";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidPurgeTaskInputError } from "./errors";
import { PurgeTaskSchema } from "./schema";

export default class PurgeTaskUseCase {
   constructor(
      private readonly tasks: TaskService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<{ id: string }> {
      const { id } = parseInput(PurgeTaskSchema, input, InvalidPurgeTaskInputError);
      this.tasks.purge(id);
      this.ctx.changes.publish({ kind: "task", id });
      return { id };
   }
}

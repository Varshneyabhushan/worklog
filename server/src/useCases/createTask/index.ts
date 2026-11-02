import { sourceKeyFromLinks, type Task } from "../../entities/task";
import type { TaskService } from "../../services/task";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidCreateTaskInputError } from "./errors";
import { CreateTaskSchema } from "./schema";

export default class CreateTaskUseCase {
   constructor(
      private readonly tasks: TaskService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<Task> {
      const { status, by, sourceKey, ...fields } = parseInput(
         CreateTaskSchema,
         input,
         InvalidCreateTaskInputError,
      );
      const task = this.tasks.create(
         {
            ...fields,
            sourceKey: sourceKey === undefined ? sourceKeyFromLinks(fields.links) : sourceKey,
         },
         status,
         this.ctx.clock.now(),
         by,
      );
      this.ctx.changes.publish({ kind: "task", id: task.id });
      return task;
   }
}

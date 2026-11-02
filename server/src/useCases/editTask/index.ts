import type { Task } from "../../entities/task";
import type { TaskChanges, TaskService } from "../../services/task";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidEditTaskInputError } from "./errors";
import { EditTaskSchema } from "./schema";

export default class EditTaskUseCase {
   constructor(
      private readonly tasks: TaskService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<Task> {
      const { id, by, ...fields } = parseInput(EditTaskSchema, input, InvalidEditTaskInputError);
      const changes = Object.fromEntries(
         Object.entries(fields).filter(([, value]) => value !== undefined),
      ) as TaskChanges;
      const task = this.tasks.edit(id, changes, this.ctx.clock.now(), by);
      this.ctx.changes.publish({ kind: "task", id });
      return task;
   }
}

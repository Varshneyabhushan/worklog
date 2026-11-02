import type { Task } from "../../entities/task";
import type { TaskService } from "../../services/task";
import type { UpdateService } from "../../services/update";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidReopenTaskInputError } from "./errors";
import { ReopenTaskSchema } from "./schema";

export default class ReopenTaskUseCase {
   constructor(
      private readonly tasks: TaskService,
      private readonly updates: UpdateService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<Task> {
      const { id, to, reason, by } = parseInput(
         ReopenTaskSchema,
         input,
         InvalidReopenTaskInputError,
      );
      const now = this.ctx.clock.now();
      this.tasks.reopen(id, to, now, by);
      const update = this.updates.add(id, reason, by, now);
      const task = this.tasks.record(id, { kind: "update_added", updateId: update.id }, now, by);
      this.ctx.changes.publish({ kind: "task", id });
      return task;
   }
}

import type { TaskService } from "../../services/task";
import type { UpdateService } from "../../services/update";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidDeleteUpdateInputError } from "./errors";
import { DeleteUpdateSchema } from "./schema";

export default class DeleteUpdateUseCase {
   constructor(
      private readonly tasks: TaskService,
      private readonly updates: UpdateService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<{ id: number; taskId: string }> {
      const { id, by } = parseInput(DeleteUpdateSchema, input, InvalidDeleteUpdateInputError);
      const deleted = this.updates.delete(id);
      this.tasks.record(
         deleted.taskId,
         { kind: "update_deleted", updateId: id },
         this.ctx.clock.now(),
         by,
      );
      this.ctx.changes.publish({ kind: "update", id: String(id) });
      return { id, taskId: deleted.taskId };
   }
}

import type { Update } from "../../entities/update";
import type { TaskService } from "../../services/task";
import type { UpdateService } from "../../services/update";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidMoveUpdateInputError } from "./errors";
import { MoveUpdateSchema } from "./schema";

/** Both tasks' histories record the move. */
export default class MoveUpdateUseCase {
   constructor(
      private readonly tasks: TaskService,
      private readonly updates: UpdateService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<Update> {
      const { id, taskId, by } = parseInput(MoveUpdateSchema, input, InvalidMoveUpdateInputError);
      this.tasks.get(taskId);
      const { before, after } = this.updates.move(id, taskId);
      const now = this.ctx.clock.now();
      const moved = {
         kind: "update_moved" as const,
         updateId: id,
         fromTaskId: before.taskId,
         toTaskId: taskId,
      };
      this.tasks.record(before.taskId, moved, now, by);
      if (before.taskId !== taskId) this.tasks.record(taskId, moved, now, by);
      this.ctx.changes.publish({ kind: "update", id: String(id) });
      return after;
   }
}

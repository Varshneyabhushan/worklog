import type { Task } from "../../entities/task";
import type { TaskService } from "../../services/task";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidUndoTaskChangeInputError } from "./errors";
import { UndoTaskChangeSchema } from "./schema";

export default class UndoTaskChangeUseCase {
   constructor(
      private readonly tasks: TaskService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<Task> {
      const { id, eventId, by } = parseInput(
         UndoTaskChangeSchema,
         input,
         InvalidUndoTaskChangeInputError,
      );
      const task = this.tasks.undo(id, eventId ?? null, this.ctx.clock.now(), by);
      this.ctx.changes.publish({ kind: "task", id });
      return task;
   }
}

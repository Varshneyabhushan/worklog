import type { Task } from "../../entities/task";
import type { TaskService } from "../../services/task";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidMoveTaskInputError, TaskAwaitsReviewError } from "./errors";
import { MoveTaskSchema } from "./schema";

export default class MoveTaskUseCase {
   constructor(
      private readonly tasks: TaskService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<Task> {
      const { id, status, by } = parseInput(MoveTaskSchema, input, InvalidMoveTaskInputError);
      if (this.tasks.get(id).isInReview) throw new TaskAwaitsReviewError(id);
      const task = this.tasks.move(id, status, this.ctx.clock.now(), by);
      this.ctx.changes.publish({ kind: "task", id });
      return task;
   }
}

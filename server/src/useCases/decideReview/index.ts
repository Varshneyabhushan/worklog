import type { Task } from "../../entities/task";
import type { TaskService } from "../../services/task";
import type { UpdateService } from "../../services/update";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidDecideReviewInputError, TaskNotInReviewError } from "./errors";
import { DecideReviewSchema } from "./schema";

/** The user's call on a task in review. Exposed only to the UI, never as a model-visible tool. */
export default class DecideReviewUseCase {
   constructor(
      private readonly tasks: TaskService,
      private readonly updates: UpdateService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<Task> {
      const { id, decision, comment } = parseInput(
         DecideReviewSchema,
         input,
         InvalidDecideReviewInputError,
      );
      if (!this.tasks.get(id).isInReview) throw new TaskNotInReviewError(id);

      const now = this.ctx.clock.now();
      if (comment !== undefined && comment.trim() !== "") {
         const update = this.updates.add(id, comment, "self", now);
         this.tasks.record(id, { kind: "update_added", updateId: update.id }, now, "self");
      }
      const task = this.tasks.move(id, decision, now, "self");
      this.ctx.changes.publish({ kind: "task", id });
      return task;
   }
}

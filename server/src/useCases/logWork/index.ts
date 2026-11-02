import { SELF, sourceKeyFromLinks, type Task } from "../../entities/task";
import type { Update } from "../../entities/update";
import type { TaskService } from "../../services/task";
import type { UpdateService } from "../../services/update";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidLogWorkInputError } from "./errors";
import { LogWorkSchema } from "./schema";

/** Unplanned work: the task and its first update in one call. */
export default class LogWorkUseCase {
   constructor(
      private readonly tasks: TaskService,
      private readonly updates: UpdateService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<{ task: Task; update: Update }> {
      const {
         update: body,
         status,
         by,
         ...fields
      } = parseInput(LogWorkSchema, input, InvalidLogWorkInputError);
      const now = this.ctx.clock.now();
      const created = this.tasks.create(
         {
            ...fields,
            due: null,
            blockedOn: null,
            assignee: SELF,
            sourceKey: sourceKeyFromLinks(fields.links),
            importedFrom: null,
         },
         status,
         now,
         by,
      );
      const update = this.updates.add(created.id, body, by, now);
      const task = this.tasks.record(
         created.id,
         { kind: "update_added", updateId: update.id },
         now,
         by,
      );
      this.ctx.changes.publish({ kind: "task", id: task.id });
      return { task, update };
   }
}

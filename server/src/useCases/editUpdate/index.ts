import type { Update } from "../../entities/update";
import type { TaskService } from "../../services/task";
import type { UpdateService } from "../../services/update";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidEditUpdateInputError } from "./errors";
import { EditUpdateSchema } from "./schema";

export default class EditUpdateUseCase {
   constructor(
      private readonly tasks: TaskService,
      private readonly updates: UpdateService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<Update> {
      const { id, body, inSummary, by } = parseInput(
         EditUpdateSchema,
         input,
         InvalidEditUpdateInputError,
      );
      const now = this.ctx.clock.now();
      let update = this.updates.get(id);
      if (body !== undefined && body !== update.body) {
         const { before, after } = this.updates.edit(id, body);
         this.tasks.record(
            after.taskId,
            { kind: "update_edited", updateId: id, from: before.body, to: after.body },
            now,
            by,
         );
         update = after;
      }
      if (inSummary !== undefined && inSummary !== update.inSummary) {
         update = this.updates.setInSummary(id, inSummary).after;
         this.tasks.record(
            update.taskId,
            { kind: "update_summary_changed", updateId: id, inSummary },
            now,
            by,
         );
      }
      this.ctx.changes.publish({ kind: "update", id: String(id) });
      return update;
   }
}

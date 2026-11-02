import type { Update } from "../../entities/update";
import type { TaskService } from "../../services/task";
import type { UpdateService } from "../../services/update";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidAddUpdateInputError } from "./errors";
import { AddUpdateSchema } from "./schema";

export default class AddUpdateUseCase {
   constructor(
      private readonly tasks: TaskService,
      private readonly updates: UpdateService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<Update> {
      const { taskId, body, by } = parseInput(AddUpdateSchema, input, InvalidAddUpdateInputError);
      this.tasks.get(taskId);
      const now = this.ctx.clock.now();
      // update first, history after: a crash between leaves an update missing only its history line
      const update = this.updates.add(taskId, body, by, now);
      this.tasks.record(taskId, { kind: "update_added", updateId: update.id }, now, by);
      this.ctx.changes.publish({ kind: "update", id: String(update.id) });
      return update;
   }
}

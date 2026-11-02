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
      const { id, body, by } = parseInput(EditUpdateSchema, input, InvalidEditUpdateInputError);
      const { before, after } = this.updates.edit(id, body);
      this.tasks.record(
         after.taskId,
         { kind: "update_edited", updateId: id, from: before.body, to: after.body },
         this.ctx.clock.now(),
         by,
      );
      this.ctx.changes.publish({ kind: "update", id: String(id) });
      return after;
   }
}

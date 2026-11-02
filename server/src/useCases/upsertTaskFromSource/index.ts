import { SELF, type Task } from "../../entities/task";
import type { TaskService } from "../../services/task";
import type { UseCaseContext } from "../shared/context";
import { parseInput } from "../shared/parseInput";
import { InvalidUpsertTaskFromSourceInputError } from "./errors";
import { UpsertTaskFromSourceSchema } from "./schema";

export interface UpsertResult {
   task: Task;
   created: boolean;
   /** The task exists but is done or dropped; reopening it is the caller's decision. */
   closed: boolean;
}

/** For routines: refreshes the title and links of the task a source key names, or creates it. */
export default class UpsertTaskFromSourceUseCase {
   constructor(
      private readonly tasks: TaskService,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(input: unknown): Promise<UpsertResult> {
      const { sourceKey, status, by, title, links, ...fields } = parseInput(
         UpsertTaskFromSourceSchema,
         input,
         InvalidUpsertTaskFromSourceInputError,
      );
      const now = this.ctx.clock.now();
      const existing = this.tasks.findBySourceKey(sourceKey);

      const task = existing
         ? this.tasks.edit(existing.id, { title, links }, now, by)
         : this.tasks.create(
              {
                 ...fields,
                 title,
                 links,
                 sourceKey,
                 due: null,
                 blockedOn: null,
                 parentId: null,
                 assignee: SELF,
                 importedFrom: null,
              },
              status,
              now,
              by,
           );
      this.ctx.changes.publish({ kind: "task", id: task.id });
      return { task, created: existing === null, closed: !task.isOpen };
   }
}

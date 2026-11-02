import { Update, type UpdateAuthor } from "../../entities/update";
import { assertValidUpdate } from "../../entities/update/validation";
import { UpdateNotFoundError } from "./errors";
import type { UpdateRepository } from "./models";

export * from "./errors";

export interface UpdateChange {
   before: Update;
   after: Update;
}

export class UpdateService {
   constructor(private readonly repo: UpdateRepository) {}

   add(taskId: string, body: string, by: UpdateAuthor, at: Date): Update {
      const update = { taskId, body, by, at };
      assertValidUpdate({ id: 0, ...update });
      return this.repo.add(update);
   }

   get(id: number): Update {
      const update = this.repo.getById(id);
      if (!update) throw new UpdateNotFoundError(id);
      return update;
   }

   edit(id: number, body: string): UpdateChange {
      return this.replace(id, { body });
   }

   move(id: number, taskId: string): UpdateChange {
      return this.replace(id, { taskId });
   }

   delete(id: number): Update {
      const update = this.get(id);
      this.repo.delete(id);
      return update;
   }

   listByTask(taskId: string): Update[] {
      return this.repo.listByTask(taskId);
   }

   listBetween(from: Date, to: Date): Update[] {
      return this.repo.listBetween(from, to);
   }

   private replace(id: number, changes: { body?: string; taskId?: string }): UpdateChange {
      const before = this.get(id);
      const next = new Update({ ...before, ...changes });
      assertValidUpdate(next);
      return { before, after: this.repo.save(next) };
   }
}

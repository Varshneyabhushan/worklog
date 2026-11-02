import type { Update, UpdateProps } from "../../entities/update";

export type NewUpdate = Omit<UpdateProps, "id">;

export interface UpdateRepository {
   add(update: NewUpdate): Update;
   getById(id: number): Update | null;
   listByTask(taskId: string): Update[];
   listBetween(from: Date, to: Date): Update[];
   save(update: Update): Update;
   delete(id: number): boolean;
}

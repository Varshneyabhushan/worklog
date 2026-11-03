import { Update, type UpdateAuthor } from "../../entities/update";
import type { NewUpdate, UpdateRepository } from "../../services/update/models";
import type { Db } from "./database";

interface UpdateRow {
   id: number;
   task_id: string;
   body: string;
   by: UpdateAuthor;
   at: string;
   in_summary: number;
}

export default class SqliteUpdateRepository implements UpdateRepository {
   constructor(private readonly db: Db) {}

   add(update: NewUpdate): Update {
      const { lastInsertRowid } = this.db
         .prepare("INSERT INTO updates (task_id, body, by, at, in_summary) VALUES (?, ?, ?, ?, ?)")
         .run(
            update.taskId,
            update.body,
            update.by,
            update.at.toISOString(),
            update.inSummary ? 1 : 0,
         );
      return this.getById(Number(lastInsertRowid)) as Update;
   }

   getById(id: number): Update | null {
      const row = this.db.prepare("SELECT * FROM updates WHERE id = ?").get(id) as
         UpdateRow | undefined;
      return row ? toUpdate(row) : null;
   }

   listByTask(taskId: string): Update[] {
      const rows = this.db
         .prepare("SELECT * FROM updates WHERE task_id = ? ORDER BY at, id")
         .all(taskId) as UpdateRow[];
      return rows.map(toUpdate);
   }

   listBetween(from: Date, to: Date): Update[] {
      const rows = this.db
         .prepare("SELECT * FROM updates WHERE at >= ? AND at < ? ORDER BY at, id")
         .all(from.toISOString(), to.toISOString()) as UpdateRow[];
      return rows.map(toUpdate);
   }

   save(update: Update): Update {
      this.db
         .prepare("UPDATE updates SET task_id = ?, body = ?, in_summary = ? WHERE id = ?")
         .run(update.taskId, update.body, update.inSummary ? 1 : 0, update.id);
      return this.getById(update.id) as Update;
   }

   delete(id: number): boolean {
      return this.db.prepare("DELETE FROM updates WHERE id = ?").run(id).changes > 0;
   }
}

function toUpdate(row: UpdateRow): Update {
   return new Update({
      id: row.id,
      taskId: row.task_id,
      body: row.body,
      by: row.by,
      at: new Date(row.at),
      inSummary: row.in_summary === 1,
   });
}

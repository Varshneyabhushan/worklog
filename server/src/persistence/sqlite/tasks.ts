import {
   Task,
   TaskEvent,
   type EventActor,
   type Priority,
   type TaskEventData,
   type TaskLink,
   type TaskStatus,
} from "../../entities/task";
import type { TaskActivity, TaskListFilter, TaskRepository } from "../../services/task/models";
import { placeholders, type Db } from "./database";

interface TaskRow {
   seq: number;
   id: string;
   title: string;
   description: string;
   status: TaskStatus;
   priority: Priority;
   due: string | null;
   blocked_on: string | null;
   tags: string;
   parent_id: string | null;
   links: string;
   assignee: string;
   source_key: string | null;
   imported_from: string | null;
}

interface EventRow {
   id: number;
   task_id: string;
   at: string;
   by: EventActor;
   reverts: number | null;
   data: string;
}

export default class SqliteTaskRepository implements TaskRepository {
   constructor(private readonly db: Db) {}

   nextSequence(): number {
      const row = this.db.prepare("SELECT COALESCE(MAX(seq), 0) + 1 AS next FROM tasks").get() as {
         next: number;
      };
      return row.next;
   }

   getById(id: string): Task | null {
      return this.load("SELECT * FROM tasks WHERE id = ?", [id])[0] ?? null;
   }

   getBySourceKey(sourceKey: string): Task | null {
      return this.load("SELECT * FROM tasks WHERE source_key = ?", [sourceKey])[0] ?? null;
   }

   list(filter: TaskListFilter): Task[] {
      const where: string[] = [];
      const params: unknown[] = [];
      if (filter.statuses) {
         if (filter.statuses.length === 0) return [];
         where.push(`status IN (${placeholders(filter.statuses)})`);
         params.push(...filter.statuses);
      }
      if (filter.ids) {
         if (filter.ids.length === 0) return [];
         where.push(`id IN (${placeholders(filter.ids)})`);
         params.push(...filter.ids);
      }
      if (filter.tag !== undefined) {
         where.push("EXISTS (SELECT 1 FROM json_each(tasks.tags) WHERE value = ?)");
         params.push(filter.tag);
      }
      if (filter.assignee !== undefined) {
         where.push("assignee = ?");
         params.push(filter.assignee);
      }
      if (filter.parentId !== undefined) {
         where.push("parent_id = ?");
         params.push(filter.parentId);
      }
      const clause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
      return this.load(`SELECT * FROM tasks ${clause} ORDER BY seq`, params);
   }

   childCount(id: string): number {
      const row = this.db
         .prepare("SELECT COUNT(*) AS n FROM tasks WHERE parent_id = ?")
         .get(id) as {
         n: number;
      };
      return row.n;
   }

   save(task: Task): Task {
      this.db.transaction(() => {
         this.db
            .prepare(
               `INSERT INTO tasks (seq, id, title, description, status, priority, due, blocked_on,
                                   tags, parent_id, links, assignee, source_key, imported_from)
                VALUES (@seq, @id, @title, @description, @status, @priority, @due, @blocked_on,
                        @tags, @parent_id, @links, @assignee, @source_key, @imported_from)
                ON CONFLICT(id) DO UPDATE SET
                   title = excluded.title, description = excluded.description,
                   status = excluded.status, priority = excluded.priority, due = excluded.due,
                   blocked_on = excluded.blocked_on, tags = excluded.tags,
                   parent_id = excluded.parent_id, links = excluded.links,
                   assignee = excluded.assignee, source_key = excluded.source_key,
                   imported_from = excluded.imported_from`,
            )
            .run(toRow(task));

         const insert = this.db.prepare(
            "INSERT INTO task_events (task_id, at, by, reverts, data) VALUES (?, ?, ?, ?, ?)",
         );
         for (const event of task.unsavedEvents) {
            insert.run(
               task.id,
               event.at.toISOString(),
               event.by,
               event.reverts,
               JSON.stringify(event.data),
            );
         }
      })();
      return this.getById(task.id) as Task;
   }

   doneBetween(from: Date, to: Date): Task[] {
      const rows = this.db
         .prepare(
            `SELECT DISTINCT task_id FROM task_events
             WHERE at >= ? AND at < ?
               AND ((json_extract(data, '$.kind') = 'status_changed' AND json_extract(data, '$.to') = 'done')
                 OR (json_extract(data, '$.kind') = 'created' AND json_extract(data, '$.status') = 'done'))`,
         )
         .all(from.toISOString(), to.toISOString()) as { task_id: string }[];

      return this.list({ ids: rows.map((row) => row.task_id) }).filter(
         (task) => task.doneAt !== null && task.doneAt >= from && task.doneAt < to,
      );
   }

   activityBetween(from: Date, to: Date): TaskActivity[] {
      const rows = this.db
         .prepare("SELECT task_id, at FROM task_events WHERE at >= ? AND at < ? ORDER BY at")
         .all(from.toISOString(), to.toISOString()) as { task_id: string; at: string }[];
      return rows.map((row) => ({ taskId: row.task_id, at: new Date(row.at) }));
   }

   purge(id: string): boolean {
      return this.db.transaction(() => {
         this.db.prepare("UPDATE tasks SET parent_id = NULL WHERE parent_id = ?").run(id);
         this.db.prepare("DELETE FROM updates WHERE task_id = ?").run(id);
         this.db.prepare("DELETE FROM task_events WHERE task_id = ?").run(id);
         return this.db.prepare("DELETE FROM tasks WHERE id = ?").run(id).changes > 0;
      })();
   }

   private load(sql: string, params: unknown[]): Task[] {
      const rows = this.db.prepare(sql).all(...params) as TaskRow[];
      if (rows.length === 0) return [];

      const eventRows = this.db
         .prepare(`SELECT * FROM task_events WHERE task_id IN (${placeholders(rows)}) ORDER BY id`)
         .all(...rows.map((row) => row.id)) as EventRow[];

      const eventsByTask = new Map<string, TaskEvent[]>();
      for (const row of eventRows) {
         const events = eventsByTask.get(row.task_id) ?? [];
         events.push(
            new TaskEvent({
               id: row.id,
               at: new Date(row.at),
               by: row.by,
               reverts: row.reverts,
               data: JSON.parse(row.data) as TaskEventData,
            }),
         );
         eventsByTask.set(row.task_id, events);
      }

      return rows.map(
         (row) =>
            new Task({
               id: row.id,
               title: row.title,
               description: row.description,
               status: row.status,
               priority: row.priority,
               due: row.due,
               blockedOn: row.blocked_on,
               tags: JSON.parse(row.tags) as string[],
               parentId: row.parent_id,
               links: JSON.parse(row.links) as TaskLink[],
               assignee: row.assignee,
               sourceKey: row.source_key,
               importedFrom: row.imported_from,
               events: eventsByTask.get(row.id) ?? [],
            }),
      );
   }
}

function toRow(task: Task): TaskRow {
   return {
      seq: Number(task.id.slice(2)),
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due: task.due,
      blocked_on: task.blockedOn,
      tags: JSON.stringify(task.tags),
      parent_id: task.parentId,
      links: JSON.stringify(task.links),
      assignee: task.assignee,
      source_key: task.sourceKey,
      imported_from: task.importedFrom,
   };
}

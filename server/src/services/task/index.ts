import {
   TASK_FIELDS,
   Task,
   TaskUndoError,
   formatTaskId,
   type EventActor,
   type NewTask,
   type TaskField,
   type TaskProps,
   type TaskStatus,
   type UpdateEventData,
} from "../../entities/task";
import { assertValidTask } from "../../entities/task/validation";
import {
   TaskNestingError,
   TaskNotFoundError,
   TaskNotReopenableError,
   TaskParentNotFoundError,
   TaskSourceKeyTakenError,
} from "./errors";
import type { TaskActivity, TaskListFilter, TaskRepository } from "./models";

export * from "./errors";
export type { TaskActivity, TaskListFilter } from "./models";

export type NewTaskFields = Omit<NewTask, "id">;
export type TaskChanges = Partial<Pick<TaskProps, TaskField>>;

export class TaskService {
   constructor(private readonly repo: TaskRepository) {}

   create(fields: NewTaskFields, status: TaskStatus, at: Date, by: EventActor): Task {
      const id = formatTaskId(this.repo.nextSequence());
      let task = Task.create({ ...fields, id, blockedOn: null }, status, at, by);
      // set as a change, so the wait has an event to date it from
      if (fields.blockedOn !== null) task = task.change("blockedOn", fields.blockedOn, at, by);
      return this.write(task);
   }

   get(id: string): Task {
      const task = this.repo.getById(id);
      if (!task) throw new TaskNotFoundError(id);
      return task;
   }

   findBySourceKey(sourceKey: string): Task | null {
      return this.repo.getBySourceKey(sourceKey);
   }

   list(filter: TaskListFilter): Task[] {
      return this.repo.list(filter);
   }

   move(id: string, status: TaskStatus, at: Date, by: EventActor): Task {
      return this.write(this.get(id).moveTo(status, at, by));
   }

   reopen(id: string, to: TaskStatus, at: Date, by: EventActor): Task {
      const task = this.get(id);
      if (task.isOpen) throw new TaskNotReopenableError(id);
      return this.write(task.moveTo(to, at, by));
   }

   edit(id: string, changes: TaskChanges, at: Date, by: EventActor): Task {
      const original = this.get(id);
      let task = original;
      for (const field of TASK_FIELDS) {
         if (field in changes) task = task.change(field, changes[field] as never, at, by);
      }
      return task === original ? original : this.write(task);
   }

   record(id: string, data: UpdateEventData, at: Date, by: EventActor): Task {
      return this.repo.save(this.get(id).record(data, at, by));
   }

   /** Undoes `eventId`, or the latest undoable change when it is null. */
   undo(id: string, eventId: number | null, at: Date, by: EventActor): Task {
      const task = this.get(id);
      const target = eventId ?? task.lastUndoable?.id ?? null;
      if (target === null) throw new TaskUndoError(`${id} has no change to undo`);
      return this.write(task.undo(target, at, by));
   }

   doneBetween(from: Date, to: Date): Task[] {
      return this.repo.doneBetween(from, to);
   }

   activityBetween(from: Date, to: Date): TaskActivity[] {
      return this.repo.activityBetween(from, to);
   }

   purge(id: string): void {
      if (!this.repo.purge(id)) throw new TaskNotFoundError(id);
   }

   private write(task: Task): Task {
      assertValidTask(task);

      if (task.sourceKey !== null) {
         const holder = this.repo.getBySourceKey(task.sourceKey);
         if (holder && holder.id !== task.id) {
            throw new TaskSourceKeyTakenError(task.sourceKey, holder.id);
         }
      }

      if (task.parentId !== null) {
         const parent = this.repo.getById(task.parentId);
         if (!parent) throw new TaskParentNotFoundError(task.parentId);
         if (parent.parentId !== null) {
            throw new TaskNestingError(`${parent.id} is a sub-task; sub-tasks are one level deep`);
         }
         if (this.repo.childCount(task.id) > 0) {
            throw new TaskNestingError(`${task.id} has sub-tasks, so it cannot become one`);
         }
      }

      return this.repo.save(task);
   }
}

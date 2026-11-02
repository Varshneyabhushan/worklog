import type { Task, TaskStatus } from "../../entities/task";

export interface TaskListFilter {
   statuses?: TaskStatus[];
   tag?: string;
   assignee?: string;
   parentId?: string;
   ids?: string[];
}

export interface TaskActivity {
   taskId: string;
   at: Date;
}

export interface TaskRepository {
   nextSequence(): number;
   getById(id: string): Task | null;
   getBySourceKey(sourceKey: string): Task | null;
   list(filter: TaskListFilter): Task[];
   childCount(id: string): number;
   /** Writes the task and its unsaved events atomically; returns it as stored, with event ids. */
   save(task: Task): Task;
   /** Tasks moved into done within the range and still done. */
   doneBetween(from: Date, to: Date): Task[];
   activityBetween(from: Date, to: Date): TaskActivity[];
   /** Deletes the task with its events and updates; false when there was no such task. */
   purge(id: string): boolean;
}

import { Task, type NewTask, type TaskStatus } from "../../src/entities/task";

export const CREATED_AT = new Date("2026-11-01T04:00:00Z");

interface TaskOverrides extends Partial<NewTask> {
   status?: TaskStatus;
   createdAt?: Date;
}

/** A task created straight into `status`, so its history is the single "created" event. */
export function makeTask({
   status = "picked",
   createdAt = CREATED_AT,
   ...task
}: TaskOverrides = {}) {
   return Task.create(
      {
         id: "W-1",
         title: "Review the UMG routing PR",
         description: "Check the secret handling before merge.",
         priority: "normal",
         due: null,
         blockedOn: null,
         tags: [],
         parentId: null,
         links: [],
         assignee: "self",
         sourceKey: null,
         importedFrom: null,
         ...task,
      },
      status,
      createdAt,
      "self",
   );
}

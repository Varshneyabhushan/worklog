import { isReopen, type TaskStatus } from "./status";

export const EVENT_ACTORS = ["self", "routine"] as const;
export type EventActor = (typeof EVENT_ACTORS)[number];

export const TASK_FIELDS = [
   "title",
   "description",
   "priority",
   "due",
   "blockedOn",
   "tags",
   "parentId",
   "links",
   "assignee",
   "sourceKey",
] as const;
export type TaskField = (typeof TASK_FIELDS)[number];

export type UpdateEventData =
   | { kind: "update_added"; updateId: number }
   | { kind: "update_moved"; updateId: number; fromTaskId: string; toTaskId: string }
   | { kind: "update_retracted"; updateId: number };

export type TaskEventData =
   | { kind: "created"; status: TaskStatus }
   | { kind: "status_changed"; from: TaskStatus; to: TaskStatus }
   | { kind: "field_changed"; field: TaskField; from: unknown; to: unknown }
   | UpdateEventData;

export interface TaskEventProps {
   /** Null until the repository saves the event. */
   id: number | null;
   at: Date;
   by: EventActor;
   /** Set on an undo: the id of the event this one reverses. */
   reverts: number | null;
   data: TaskEventData;
}

export interface TaskEvent extends Readonly<TaskEventProps> {}
export class TaskEvent {
   constructor(props: TaskEventProps) {
      Object.assign(this, props);
   }

   get isReopen(): boolean {
      return this.data.kind === "status_changed" && isReopen(this.data.from, this.data.to);
   }

   /** The status this event leaves the task in, if it sets one. */
   get enters(): TaskStatus | null {
      if (this.data.kind === "created") return this.data.status;
      if (this.data.kind === "status_changed") return this.data.to;
      return null;
   }

   toJSON() {
      return { ...this, isReopen: this.isReopen };
   }
}

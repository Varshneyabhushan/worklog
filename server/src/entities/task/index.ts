import type { LocalDate } from "../../utils/dates";
import { InvalidStatusTransitionError, TaskUndoError } from "./errors";
import {
   TaskEvent,
   type EventActor,
   type TaskEventData,
   type TaskField,
   type UpdateEventData,
} from "./events";
import { canTransition, isOpen, type TaskStatus } from "./status";

export * from "./errors";
export * from "./events";
export * from "./status";

export const PRIORITIES = ["high", "normal", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const LINK_KINDS = ["ticket", "pr", "slack", "artifact", "meeting", "other"] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export interface TaskLink {
   kind: LinkKind;
   url: string;
   label: string | null;
}

export const SELF = "self";
export const UNGROUPED = "Other";

export interface TaskProps {
   id: string;
   title: string;
   description: string;
   status: TaskStatus;
   priority: Priority;
   due: LocalDate | null;
   blockedOn: string | null;
   tags: string[];
   parentId: string | null;
   links: TaskLink[];
   assignee: string;
   sourceKey: string | null;
   importedFrom: string | null;
   events: TaskEvent[];
}

export type NewTask = Omit<TaskProps, "status" | "events">;

// declaration merging gives the class its readonly fields; the constructor copies them in
export interface Task extends Readonly<TaskProps> {}
export class Task {
   constructor(props: TaskProps) {
      Object.assign(this, props);
   }

   static create(task: NewTask, status: TaskStatus, at: Date, by: EventActor): Task {
      return new Task({ ...task, status, events: [] }).append(
         {},
         { kind: "created", status },
         at,
         by,
      );
   }

   get isOpen(): boolean {
      return isOpen(this.status);
   }

   /** Leaving review is the user's decision alone; only a UI-only use case may make it. */
   get isInReview(): boolean {
      return this.status === "in_review";
   }

   get isWaiting(): boolean {
      return this.blockedOn !== null;
   }

   get displayGroup(): string {
      return this.tags[0] ?? UNGROUPED;
   }

   get primaryLink(): TaskLink | null {
      return this.links[0] ?? null;
   }

   get createdAt(): Date {
      return this.events[0].at;
   }

   get pickedAt(): Date | null {
      return this.status === "picked" ? this.lastEntryInto("picked") : null;
   }

   get doneAt(): Date | null {
      return this.status === "done" ? this.lastEntryInto("done") : null;
   }

   get waitingSince(): Date | null {
      if (this.blockedOn === null) return null;
      const set = this.latest(
         ({ data }) => data.kind === "field_changed" && data.field === "blockedOn",
      );
      return set?.at ?? null;
   }

   get reopenCount(): number {
      return this.events.filter((event) => event.isReopen).length;
   }

   get unsavedEvents(): TaskEvent[] {
      return this.events.filter((event) => event.id === null);
   }

   canMoveTo(status: TaskStatus): boolean {
      return canTransition(this.status, status);
   }

   moveTo(status: TaskStatus, at: Date, by: EventActor): Task {
      if (!this.canMoveTo(status)) throw new InvalidStatusTransitionError(this.status, status);
      return this.append(
         { status },
         { kind: "status_changed", from: this.status, to: status },
         at,
         by,
      );
   }

   /** Returns the task unchanged, with no event, when the value is already set. */
   change<F extends TaskField>(field: F, value: TaskProps[F], at: Date, by: EventActor): Task {
      const from = this[field];
      if (JSON.stringify(from) === JSON.stringify(value)) return this;
      return this.append(
         { [field]: value },
         { kind: "field_changed", field, from, to: value },
         at,
         by,
      );
   }

   record(data: UpdateEventData, at: Date, by: EventActor): Task {
      return this.append({}, data, at, by);
   }

   /** The latest saved status or field change that hasn't been undone, nor is itself an undo. */
   get lastUndoable(): TaskEvent | null {
      const undone = new Set(this.events.map((event) => event.reverts));
      return (
         this.latest(
            (event) =>
               event.id !== null &&
               event.reverts === null &&
               !undone.has(event.id) &&
               (event.data.kind === "status_changed" || event.data.kind === "field_changed"),
         ) ?? null
      );
   }

   /** Restores what a status or field change replaced; refused once the task has moved on. */
   undo(eventId: number, at: Date, by: EventActor): Task {
      const target = this.events.find((event) => event.id === eventId);
      if (!target) throw new TaskUndoError(`${this.id} has no event ${eventId}`);
      if (this.events.some((event) => event.reverts === eventId)) {
         throw new TaskUndoError(`event ${eventId} on ${this.id} is already undone`);
      }

      const { data } = target;
      if (data.kind === "status_changed") {
         if (this.status !== data.to) {
            throw new TaskUndoError(`${this.id} has moved since event ${eventId}`);
         }
         const reverse: TaskEventData = { kind: "status_changed", from: data.to, to: data.from };
         return this.append({ status: data.from }, reverse, at, by, eventId);
      }
      if (data.kind === "field_changed") {
         if (JSON.stringify(this[data.field]) !== JSON.stringify(data.to)) {
            throw new TaskUndoError(
               `${this.id}'s ${data.field} has changed since event ${eventId}`,
            );
         }
         const reverse: TaskEventData = {
            kind: "field_changed",
            field: data.field,
            from: data.to,
            to: data.from,
         };
         return this.append({ [data.field]: data.from }, reverse, at, by, eventId);
      }
      throw new TaskUndoError(`a ${data.kind} event cannot be undone`);
   }

   toJSON() {
      return {
         ...this,
         isOpen: this.isOpen,
         isInReview: this.isInReview,
         isWaiting: this.isWaiting,
         displayGroup: this.displayGroup,
         primaryLink: this.primaryLink,
         createdAt: this.createdAt,
         pickedAt: this.pickedAt,
         doneAt: this.doneAt,
         waitingSince: this.waitingSince,
         reopenCount: this.reopenCount,
      };
   }

   private append(
      changes: Partial<TaskProps>,
      data: TaskEventData,
      at: Date,
      by: EventActor,
      reverts: number | null = null,
   ): Task {
      const event = new TaskEvent({ id: null, at, by, reverts, data });
      return new Task({ ...this, ...changes, events: [...this.events, event] });
   }

   private lastEntryInto(status: TaskStatus): Date | null {
      return this.latest((event) => event.enters === status)?.at ?? null;
   }

   private latest(matches: (event: TaskEvent) => boolean): TaskEvent | undefined {
      return [...this.events].reverse().find(matches);
   }
}

const TASK_ID = /^W-([1-9]\d*)$/;

export function formatTaskId(sequence: number): string {
   return `W-${sequence}`;
}

export function isTaskId(value: string): boolean {
   return TASK_ID.test(value);
}

const LINEAR_ISSUE = /linear\.app\/[^/]+\/issue\/([A-Z][A-Z0-9]*-\d+)/;
const GITHUB_PR = /github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/;

/** A ticket or PR link names the source the morning routine will look the task up by. */
export function sourceKeyFromLinks(links: TaskLink[]): string | null {
   for (const link of links) {
      const issue = link.kind === "ticket" ? LINEAR_ISSUE.exec(link.url) : null;
      if (issue) return `linear:${issue[1]}`;
      const pr = link.kind === "pr" ? GITHUB_PR.exec(link.url) : null;
      if (pr) return `gh:${pr[1]}#${pr[2]}`;
   }
   return null;
}

export function normalizeTag(raw: string): string {
   return raw
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "");
}

function urgencyRank(task: Task, today: LocalDate): number {
   if (task.due !== null && task.due < today) return 0;
   if (task.due === today) return 1;
   return 2 + PRIORITIES.indexOf(task.priority);
}

/** The agreed order: overdue, due today, high, normal, low; then soonest due, then oldest pick. */
export function compareForPlan(a: Task, b: Task, today: LocalDate): number {
   const byUrgency = urgencyRank(a, today) - urgencyRank(b, today);
   if (byUrgency !== 0) return byUrgency;

   if (a.due !== b.due) {
      if (a.due === null) return 1;
      if (b.due === null) return -1;
      return a.due < b.due ? -1 : 1;
   }

   return (a.pickedAt ?? a.createdAt).getTime() - (b.pickedAt ?? b.createdAt).getTime();
}

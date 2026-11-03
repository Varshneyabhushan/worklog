/** The service's JSON shapes, as `/api` and the MCP tools return them. */

export type TaskStatus = "backlog" | "picked" | "in_review" | "done" | "dropped";
export type Priority = "high" | "normal" | "low";
export type LinkKind = "ticket" | "pr" | "slack" | "artifact" | "meeting" | "other";

export const PRIORITIES: Priority[] = ["high", "normal", "low"];
export const STATUSES: TaskStatus[] = ["backlog", "picked", "in_review", "done", "dropped"];

export interface Link {
   kind: LinkKind;
   url: string;
   label: string | null;
}

export interface TaskEvent {
   id: number;
   at: string;
   by: string;
   reverts: number | null;
   data: { kind: string; [field: string]: unknown };
   isReopen: boolean;
}

export interface Task {
   id: string;
   title: string;
   description: string;
   status: TaskStatus;
   priority: Priority;
   due: string | null;
   blockedOn: string | null;
   tags: string[];
   parentId: string | null;
   links: Link[];
   assignee: string;
   sourceKey: string | null;
   importedFrom: string | null;
   events: TaskEvent[];
   isOpen: boolean;
   isInReview: boolean;
   isWaiting: boolean;
   displayGroup: string;
   primaryLink: Link | null;
   createdAt: string;
   pickedAt: string | null;
   doneAt: string | null;
   waitingSince: string | null;
   reopenCount: number;
}

export interface Update {
   id: number;
   taskId: string;
   body: string;
   by: string;
   at: string;
}

export interface TaskDetail {
   task: Task;
   updates: Update[];
   subTasks: Task[];
}

export interface Meeting {
   id: number;
   startsAt: string;
   endsAt: string | null;
   title: string;
   joinUrl: string | null;
   cancelled: boolean;
}

export interface DayNote {
   id: number;
   body: string;
   createdAt: string;
}

export interface Day {
   date: string;
   summary: string | null;
   signedOffAt: string | null;
   notes: DayNote[];
   isSignedOff: boolean;
}

export interface DayView {
   day: Day;
   tasks: Task[];
   doneTaskIds: string[];
   updates: Update[];
}

export interface Today {
   date: string;
   timeZone: string;
   generatedAt: string;
   unsignedDays: string[];
   schedule: { meeting: Meeting; state: "upcoming" | "in_progress" | "over" }[];
   forReview: Task[];
   picked: { group: string; tasks: Task[] }[];
   waiting: Task[];
   progress: { done: Task[]; updates: { task: Task; updates: Update[] }[] };
   notes: DayNote[];
   backlogCount: number;
}

export interface SearchHit {
   kind: "task" | "update" | "note";
   ref: string;
   snippet: string;
   taskId: string | null;
}

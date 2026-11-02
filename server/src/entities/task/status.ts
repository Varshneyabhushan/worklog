export const TASK_STATUSES = ["backlog", "picked", "in_review", "done", "dropped"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

const TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
   backlog: ["picked", "in_review", "done", "dropped"],
   picked: ["backlog", "in_review", "done", "dropped"],
   in_review: ["picked", "done", "dropped"],
   done: ["picked", "backlog"],
   dropped: ["picked", "backlog"],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
   return TRANSITIONS[from].includes(to);
}

export function isOpen(status: TaskStatus): boolean {
   return status === "backlog" || status === "picked" || status === "in_review";
}

export function isReopen(from: TaskStatus, to: TaskStatus): boolean {
   return !isOpen(from) && isOpen(to);
}

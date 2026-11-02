import { isLocalDate } from "../../utils/dates";
import { isHttpUrl, isSlug } from "../../utils/text";
import { LINK_KINDS, SELF, type TaskLink, type TaskProps } from ".";
import type { TaskEvent } from "./events";
import { canTransition, type TaskStatus } from "./status";
import { InvalidStatusTransitionError, TaskInvariantError } from "./errors";

const SOURCE_KEY = /^[a-z][a-z0-9-]*:\S+$/;
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 20_000;

export function assertValidTitle(title: string): void {
   const trimmed = title.trim();
   if (trimmed === "") throw new TaskInvariantError("a task needs a title", "title", title);
   if (/[\r\n]/.test(title)) throw new TaskInvariantError("a title is one line", "title", title);
   if (trimmed.length > MAX_TITLE) {
      throw new TaskInvariantError(`a title is at most ${MAX_TITLE} characters`, "title", title);
   }
}

export function assertValidDescription(description: string): void {
   if (description.trim() === "") {
      throw new TaskInvariantError("a task needs a description", "description", description);
   }
   if (description.length > MAX_DESCRIPTION) {
      throw new TaskInvariantError(
         `a description is at most ${MAX_DESCRIPTION} characters`,
         "description",
         description.length,
      );
   }
}

export function assertValidTags(tags: string[]): void {
   for (const tag of tags) {
      if (!isSlug(tag)) {
         throw new TaskInvariantError(`tags are lowercase-hyphenated: "${tag}"`, "tags", tag);
      }
   }
   if (new Set(tags).size !== tags.length) {
      throw new TaskInvariantError("a tag appears twice", "tags", tags);
   }
}

export function assertValidLinks(links: TaskLink[]): void {
   for (const link of links) {
      if (!LINK_KINDS.includes(link.kind)) {
         throw new TaskInvariantError(`unknown link kind "${link.kind}"`, "links", link);
      }
      if (!isHttpUrl(link.url)) {
         throw new TaskInvariantError(`not an http(s) url: ${link.url}`, "links", link);
      }
   }
}

export function assertValidDue(due: string | null): void {
   if (due !== null && !isLocalDate(due)) {
      throw new TaskInvariantError(`not a real date: ${due}`, "due", due);
   }
}

export function assertValidWait(blockedOn: string | null): void {
   if (blockedOn !== null && blockedOn.trim() === "") {
      throw new TaskInvariantError("a wait needs a reason", "blockedOn", blockedOn);
   }
}

export function assertValidAssignee(assignee: string): void {
   if (assignee !== SELF && !isSlug(assignee)) {
      throw new TaskInvariantError(
         `assignee is "${SELF}" or a lowercase-hyphenated agent name`,
         "assignee",
         assignee,
      );
   }
}

export function assertValidSourceKey(sourceKey: string | null): void {
   if (sourceKey !== null && !SOURCE_KEY.test(sourceKey)) {
      throw new TaskInvariantError(
         `a source key is "<source>:<id>": ${sourceKey}`,
         "sourceKey",
         sourceKey,
      );
   }
}

export function assertValidParent(task: Pick<TaskProps, "id" | "parentId">): void {
   if (task.parentId === task.id) {
      throw new TaskInvariantError("a task cannot be its own parent", "parentId", task.parentId);
   }
}

export function assertValidTransition(from: TaskStatus, to: TaskStatus): void {
   if (!canTransition(from, to)) throw new InvalidStatusTransitionError(from, to);
}

/** The history must start with "created", run forward in time, and replay to the current status. */
export function assertValidHistory(events: TaskEvent[], status: TaskStatus): void {
   const [first, ...rest] = events;
   if (first?.data.kind !== "created") {
      throw new TaskInvariantError("a task's history starts with its creation", "events", first);
   }

   let current = first.data.status;
   let previousAt = first.at;
   for (const event of rest) {
      if (event.at < previousAt) {
         throw new TaskInvariantError("events are in time order", "events", event);
      }
      previousAt = event.at;

      if (event.data.kind === "created") {
         throw new TaskInvariantError("a task is created once", "events", event);
      }
      if (event.data.kind === "status_changed") {
         // an undo restores the earlier status, which the forward table needn't allow
         const allowed = event.reverts !== null || canTransition(event.data.from, event.data.to);
         if (event.data.from !== current || !allowed) {
            throw new TaskInvariantError(
               `history moves ${event.data.from} → ${event.data.to} while the task is ${current}`,
               "events",
               event,
            );
         }
         current = event.data.to;
      }
   }

   if (current !== status) {
      throw new TaskInvariantError(
         `history ends in ${current} but the task is ${status}`,
         "status",
         status,
      );
   }
}

export function assertValidTask(task: TaskProps): void {
   assertValidTitle(task.title);
   assertValidDescription(task.description);
   assertValidTags(task.tags);
   assertValidLinks(task.links);
   assertValidDue(task.due);
   assertValidWait(task.blockedOn);
   assertValidAssignee(task.assignee);
   assertValidSourceKey(task.sourceKey);
   assertValidParent(task);
   assertValidHistory(task.events, task.status);
}

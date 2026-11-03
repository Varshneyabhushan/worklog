import { STATUS_LABELS } from "../shared/format";
import type { TaskEvent, TaskStatus, Update } from "../shared/types";

export type TimelineEntry =
   | { kind: "event"; at: string; by: string; text: string }
   | { kind: "update"; at: string; by: string; update: Update };

const FIELD_LABELS: Record<string, string> = {
   title: "title",
   priority: "priority",
   due: "due date",
   tags: "tags",
   parentId: "parent",
   links: "links",
   assignee: "assignee",
   sourceKey: "source key",
};

function show(value: unknown): string {
   if (value === null || value === undefined || value === "") return "none";
   if (Array.isArray(value)) return value.length === 0 ? "none" : value.join(", ");
   return String(value);
}

/** One line for a history event, or null for an event the timeline shows another way. */
export function describeEvent(event: TaskEvent): string | null {
   const data = event.data;
   const prefix = event.reverts !== null ? "undid a change: " : "";
   const status = (value: unknown) => STATUS_LABELS[value as TaskStatus] ?? String(value);
   switch (data.kind) {
      case "created":
         return `created in ${status(data.status)}`;
      case "status_changed":
         return `${prefix}${event.isReopen ? "reopened" : "moved"}: ${status(data.from)} to ${status(data.to)}`;
      case "field_changed":
         if (data.field === "description") return `${prefix}edited the description`;
         if (data.field === "blockedOn") {
            return data.to === null
               ? `${prefix}stopped waiting`
               : `${prefix}waiting on ${show(data.to)}`;
         }
         if (data.field === "links") return `${prefix}changed the links`;
         return `${prefix}${FIELD_LABELS[data.field as string] ?? data.field}: ${show(data.from)} to ${show(data.to)}`;
      case "update_edited":
         return "edited an update";
      case "update_moved":
         return `moved an update from ${data.fromTaskId} to ${data.toTaskId}`;
      case "update_deleted":
         return "deleted an update";
      default:
         return null;
   }
}

export function timeline(events: TaskEvent[], updates: Update[]): TimelineEntry[] {
   const entries: TimelineEntry[] = [
      ...events.flatMap((event): TimelineEntry[] => {
         const text = describeEvent(event);
         return text === null ? [] : [{ kind: "event", at: event.at, by: event.by, text }];
      }),
      ...updates.map((update): TimelineEntry => ({
         kind: "update",
         at: update.at,
         by: update.by,
         update,
      })),
   ];
   return entries.sort((a, b) => a.at.localeCompare(b.at));
}

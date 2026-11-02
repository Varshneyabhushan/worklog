import type { DayNote } from "../../entities/day";
import type { Meeting } from "../../entities/meeting";
import { compareForPlan, type Task } from "../../entities/task";
import type { Update } from "../../entities/update";
import type { MeetingService } from "../../services/meeting";
import { dayRange, localDateOf, type LocalDate } from "../../utils/dates";
import { unsignedDays, type ActivityServices } from "./dayActivity";

export type MeetingState = "upcoming" | "in_progress" | "over";

export interface Today {
   date: LocalDate;
   timeZone: string;
   generatedAt: Date;
   unsignedDays: LocalDate[];
   schedule: { meeting: Meeting; state: MeetingState }[];
   forReview: Task[];
   picked: { group: string; tasks: Task[] }[];
   waiting: Task[];
   progress: { done: Task[]; updates: { task: Task; updates: Update[] }[] };
   notes: DayNote[];
   backlogCount: number;
}

export interface TodayServices extends ActivityServices {
   meetings: MeetingService;
}

export function buildToday(services: TodayServices, now: Date, timeZone: string): Today {
   const date = localDateOf(now, timeZone);
   const { from, to } = dayRange(date, timeZone);
   const byPlan = (a: Task, b: Task) => compareForPlan(a, b, date);

   const open = services.tasks.list({ statuses: ["backlog", "picked", "in_review"] });
   const picked = open.filter((task) => task.status === "picked").sort(byPlan);

   const groups = new Map<string, Task[]>();
   for (const task of picked.filter((task) => !task.isWaiting)) {
      groups.set(task.displayGroup, [...(groups.get(task.displayGroup) ?? []), task]);
   }

   const updates = services.updates.listBetween(from, to);
   const updatedIds = [...new Set(updates.map((update) => update.taskId))];
   const updatedTasks = new Map(
      services.tasks.list({ ids: updatedIds }).map((task) => [task.id, task]),
   );

   return {
      date,
      timeZone,
      generatedAt: now,
      unsignedDays: unsignedDays(services, now, timeZone),
      schedule: services.meetings.startingBetween(from, to).map((meeting) => ({
         meeting,
         state: meeting.isOver(now) ? "over" : meeting.hasStarted(now) ? "in_progress" : "upcoming",
      })),
      forReview: open.filter((task) => task.isInReview).sort(byPlan),
      picked: [...groups.entries()].map(([group, tasks]) => ({ group, tasks })),
      waiting: picked.filter((task) => task.isWaiting),
      progress: {
         done: services.tasks.doneBetween(from, to),
         updates: updatedIds.flatMap((id) => {
            const task = updatedTasks.get(id);
            return task
               ? [{ task, updates: updates.filter((update) => update.taskId === id) }]
               : [];
         }),
      },
      notes: services.days.get(date).notes,
      backlogCount: open.filter((task) => task.status === "backlog").length,
   };
}

import type { Day } from "../../entities/day";
import type { Task } from "../../entities/task";
import type { Update } from "../../entities/update";
import type { DayService } from "../../services/day";
import type { TaskService } from "../../services/task";
import type { UpdateService } from "../../services/update";
import { addDays, dayRange, localDateOf, startOfDay, type LocalDate } from "../../utils/dates";

export interface DayActivity {
   date: LocalDate;
   day: Day;
   /** Tasks done that day, tasks updated that day, and every task currently picked or in review. */
   tasks: Task[];
   doneIds: Set<string>;
   updatesByTask: Map<string, Update[]>;
}

export interface ActivityServices {
   tasks: TaskService;
   updates: UpdateService;
   days: DayService;
}

export function gatherDay(
   services: ActivityServices,
   date: LocalDate,
   timeZone: string,
): DayActivity {
   const { from, to } = dayRange(date, timeZone);
   const updates = services.updates.listBetween(from, to);
   const done = services.tasks.doneBetween(from, to);
   const current = services.tasks.list({ statuses: ["picked", "in_review"] });

   const updatesByTask = new Map<string, Update[]>();
   for (const update of updates) {
      updatesByTask.set(update.taskId, [...(updatesByTask.get(update.taskId) ?? []), update]);
   }

   const ids = new Set([...updatesByTask.keys(), ...done.map((task) => task.id)]);
   for (const task of current) ids.add(task.id);

   return {
      date,
      day: services.days.get(date),
      tasks: services.tasks.list({ ids: [...ids] }),
      doneIds: new Set(done.map((task) => task.id)),
      updatesByTask,
   };
}

const LOOKBACK_DAYS = 14;

/** Earlier days with activity in the lookback window that were never signed off, oldest first. */
export function unsignedDays(services: ActivityServices, now: Date, timeZone: string): LocalDate[] {
   const today = localDateOf(now, timeZone);
   const since = addDays(today, -LOOKBACK_DAYS);
   const from = startOfDay(since, timeZone);
   const to = startOfDay(today, timeZone);

   const dates = new Set<LocalDate>(services.days.datesWithNotes(since, today));
   for (const update of services.updates.listBetween(from, to)) {
      dates.add(localDateOf(update.at, timeZone));
   }
   for (const activity of services.tasks.activityBetween(from, to)) {
      dates.add(localDateOf(activity.at, timeZone));
   }

   const signed = new Set(services.days.signedOff([...dates]));
   return [...dates].filter((date) => !signed.has(date)).sort();
}

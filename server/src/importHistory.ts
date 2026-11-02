import fs from "fs";
import path from "path";
import { config } from "./config";
import { sourceKeyFromLinks, type TaskStatus } from "./entities/task";
import { dateOfFile, parseDayFile, type ParsedDay } from "./migration/dayFile";
import { planImport, type ImportPlan } from "./migration/plan";
import { openDatabase, type Db } from "./persistence/sqlite/database";
import SqliteDayRepository from "./persistence/sqlite/days";
import SqliteMeetingRepository from "./persistence/sqlite/meetings";
import SqliteTaskRepository from "./persistence/sqlite/tasks";
import { DayService } from "./services/day";
import { MeetingService } from "./services/meeting";
import { TaskService } from "./services/task";

// One-off import of the markdown day files: `--write` applies to the real database; without it
// the plan is applied to an in-memory copy and reported, so a dry run exercises every rule.

const usage = "usage: ts-node src/importHistory.ts <worklog-folder> [--write] [--report <file.md>]";

function readDays(root: string): ParsedDay[] {
   const days: ParsedDay[] = [];
   for (const folder of fs.readdirSync(root, { withFileTypes: true })) {
      if (!folder.isDirectory() || folder.name.startsWith(".")) continue;
      for (const file of fs.readdirSync(path.join(root, folder.name))) {
         const date = dateOfFile(file);
         if (date === null || !/\.md$/i.test(file)) continue;
         const relative = `${folder.name}/${file}`;
         days.push(
            parseDayFile(relative, date, fs.readFileSync(path.join(root, relative), "utf-8")),
         );
      }
   }
   return days;
}

interface Outcome {
   failures: string[];
   counts: Record<TaskStatus, number>;
   open: {
      id: string;
      title: string;
      status: TaskStatus;
      tags: string[];
      blockedOn: string | null;
      parentId: string | null;
   }[];
   tasks: number;
   events: number;
   meetings: number;
   days: number;
   notes: number;
}

function apply(db: Db, plan: ImportPlan): Outcome {
   const tasks = new TaskService(new SqliteTaskRepository(db));
   const days = new DayService(new SqliteDayRepository(db));
   const meetings = new MeetingService(new SqliteMeetingRepository(db));
   const ids = new Map<string, string>();
   const failed = new Set<string>();
   const failures: string[] = [];

   const ordered = [...plan.ops].sort((a, b) => a.at.getTime() - b.at.getTime());
   for (const op of ordered) {
      if (failed.has(op.key)) continue;
      try {
         if (op.kind === "create") {
            const parentId =
               op.fields.parentKey === null ? null : (ids.get(op.fields.parentKey) ?? null);
            const task = tasks.create(
               {
                  title: op.fields.title,
                  description: op.fields.description,
                  priority: "normal",
                  due: null,
                  blockedOn: op.fields.blockedOn,
                  tags: op.fields.tags,
                  parentId,
                  links: op.fields.links,
                  assignee: "self",
                  sourceKey: null,
                  importedFrom: op.fields.importedFrom,
               },
               op.status,
               op.at,
               "self",
            );
            ids.set(op.key, task.id);
         } else {
            const id = ids.get(op.key);
            if (id === undefined) continue;
            if (op.kind === "move") tasks.move(id, op.status, op.at, "self");
            else tasks.edit(id, op.changes, op.at, "self");
         }
      } catch (err) {
         failed.add(op.key);
         failures.push(`${op.key} ${op.kind} at ${op.at.toISOString()}: ${(err as Error).message}`);
      }
   }

   for (const task of tasks.list({ statuses: ["backlog", "picked"] })) {
      const sourceKey = sourceKeyFromLinks(task.links);
      if (sourceKey !== null && tasks.findBySourceKey(sourceKey) === null) {
         tasks.edit(task.id, { sourceKey }, task.events.at(-1)?.at ?? new Date(), "self");
      }
   }

   for (const meeting of plan.meetings) {
      meetings.add({
         startsAt: meeting.startsAt,
         endsAt: null,
         title: meeting.title,
         joinUrl: meeting.joinUrl,
         source: "manual",
         cancelled: meeting.cancelled,
      });
   }

   let noteCount = 0;
   for (const day of plan.days) {
      for (const note of day.notes) {
         days.addNote(day.date, note, day.signedOffAt);
         noteCount += 1;
      }
      days.signOff(day.date, day.summary, day.signedOffAt);
   }

   const everything = tasks.list({});
   const counts = { backlog: 0, picked: 0, in_review: 0, done: 0, dropped: 0 };
   for (const task of everything) counts[task.status] += 1;
   return {
      failures,
      counts,
      open: everything
         .filter((task) => task.status === "picked" || task.status === "backlog")
         .map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            tags: task.tags,
            blockedOn: task.blockedOn,
            parentId: task.parentId,
         })),
      tasks: everything.length,
      events: everything.reduce((sum, task) => sum + task.events.length, 0),
      meetings: plan.meetings.length,
      days: plan.days.length,
      notes: noteCount,
   };
}

function report(plan: ImportPlan, outcome: Outcome, written: boolean): string {
   const longest = [...plan.tasks].sort((a, b) => b.daysSeen - a.daysSeen).slice(0, 10);
   const lines = [
      `# History import — ${written ? "written" : "dry run"}`,
      "",
      `- day files: ${outcome.days} days, ${outcome.notes} day notes (the files verbatim), all signed off with their Summary`,
      `- tasks: ${outcome.tasks} (${Object.entries(outcome.counts)
         .map(([status, n]) => `${status} ${n}`)
         .join(", ")}), ${outcome.events} events`,
      `- meetings: ${outcome.meetings}`,
      `- failures: ${outcome.failures.length}`,
      ...outcome.failures.slice(0, 30).map((failure) => `  - ${failure}`),
      "",
      `## Open after the import (from ${plan.lastDate ?? "—"})`,
      "",
      ...outcome.open.map(
         (task) =>
            `- ${task.parentId ? "  ↳ " : ""}${task.id} [${task.status}]${task.tags.length ? ` #${task.tags.join(" #")}` : ""} ${task.title}${task.blockedOn ? ` ⌛ ${task.blockedOn}` : ""}`,
      ),
      "",
      "## Longest-carried tasks",
      "",
      ...longest.map(
         (task) =>
            `- ${task.daysSeen} days (${task.firstSeen} → ${task.lastSeen}) [${task.status}] ${task.title}`,
      ),
      "",
   ];
   return lines.join("\n");
}

function main() {
   const args = process.argv.slice(2);
   const root = args.find((arg) => !arg.startsWith("--"));
   if (!root) throw new Error(usage);
   const write = args.includes("--write");
   const reportIndex = args.indexOf("--report");
   const reportPath = reportIndex >= 0 ? args[reportIndex + 1] : null;

   const plan = planImport(readDays(root), config.timeZone);

   let db: Db;
   if (write) {
      fs.mkdirSync(config.dataDir, { recursive: true });
      db = openDatabase(config.databasePath);
      const existing = db
         .prepare("SELECT (SELECT COUNT(*) FROM tasks) + (SELECT COUNT(*) FROM days) AS n")
         .get() as {
         n: number;
      };
      if (existing.n > 0)
         throw new Error(
            `${config.databasePath} already has tasks or days; import into an empty database`,
         );
   } else {
      db = openDatabase(":memory:");
   }

   const outcome = db.transaction(() => apply(db, plan))();
   const text = report(plan, outcome, write);
   if (reportPath) fs.writeFileSync(reportPath, text);
   console.log(text.split("\n").slice(0, 8).join("\n"));
   db.close();
}

main();

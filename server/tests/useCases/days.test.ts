import { describe, expect, it } from "vitest";
import { REPORT_MARKER } from "../../src/useCases/shared/report";
import { ReportNotGeneratedError } from "../../src/useCases/signOffDay/errors";
import { TASK, makeApp } from "../fakes/app";

describe("day use cases", () => {
   it("adds a note to today, or to an earlier day", async () => {
      const { useCases } = makeApp();
      const today = await useCases.addDayNote.execute({ body: "Bug bash moved to Thursday." });
      const earlier = await useCases.addDayNote.execute({
         body: "Forgot: demo went well.",
         date: "2026-11-01",
      });
      expect(today.date).toBe("2026-11-03");
      expect(earlier.date).toBe("2026-11-01");
      expect(earlier.notes.map((note) => note.body)).toEqual(["Forgot: demo went well."]);
   });

   it("signs a day off: freezes the Summary and writes the markdown report", async () => {
      const { useCases, files, clock } = makeApp("2026-11-02T05:00:00Z");
      await useCases.createTask.execute({
         title: "Waiting one",
         description: "x",
         status: "picked",
      });
      await useCases.editTask.execute({ id: "W-1", blockedOn: "OpenVPN access" });
      clock.set("2026-11-03T04:30:00Z");
      await useCases.createTask.execute({
         ...TASK,
         status: "picked",
         tags: ["evals"],
         links: [{ kind: "pr", url: "https://github.com/org/repo/pull/31" }],
      });
      await useCases.addUpdate.execute({
         taskId: "W-2",
         body: "Judge calls moved.\nActor calls next.",
      });
      await useCases.moveTask.execute({ id: "W-2", status: "done" });
      clock.set("2026-11-03T12:00:00Z");
      await useCases.addDayNote.execute({ body: "Bug bash moved to Thursday." });

      const { day, path } = await useCases.signOffDay.execute({});
      expect(path).toBe("/reports/november 2026/03-11-2026.md");
      expect(day.isSignedOff).toBe(true);
      expect(day.summary).toBe(
         [
            "## evals",
            "",
            "- [Route model calls through UMG](https://github.com/org/repo/pull/31) · W-2 ✓",
            "  - Judge calls moved.",
            "    Actor calls next.",
         ].join("\n"),
      );
      expect(files.written.get(path)).toBe(
         [
            REPORT_MARKER,
            "# TODOs",
            "## Other\n\n- [ ] Waiting one · W-1 ⌛ OpenVPN access (1d)",
            "## evals\n\n- [x] [Route model calls through UMG](https://github.com/org/repo/pull/31) · W-2",
            "# Summary",
            day.summary,
            "# Notes",
            "- Bug bash moved to Thursday.",
         ].join("\n\n") + "\n",
      );
   });

   it("leaves remarks out of the Summary and today's progress, but not out of the day", async () => {
      const { useCases } = makeApp();
      await useCases.createTask.execute({ ...TASK, status: "picked", tags: ["evals"] });
      await useCases.createTask.execute({ ...TASK, status: "picked", tags: ["evals"] });
      await useCases.addUpdate.execute({ taskId: "W-1", body: "Fixed the judge." });
      await useCases.addUpdate.execute({ taskId: "W-1", body: "Run 12 red.", inSummary: false });
      await useCases.addUpdate.execute({ taskId: "W-2", body: "Run 13 red.", inSummary: false });

      const today = await useCases.getToday.execute({});
      expect(today.progress.updates.map((u) => [u.task.id, u.updates.length])).toEqual([
         ["W-1", 1],
      ]);
      expect((await useCases.getDay.execute({ date: "2026-11-03" })).updates).toHaveLength(3);

      const { day } = await useCases.signOffDay.execute({});
      expect(day.summary).toContain("Fixed the judge.");
      expect(day.summary).not.toContain("red");
   });

   it("leaves a task done without an update out of the Summary, but ticks it in the TODOs", async () => {
      const { useCases, files } = makeApp();
      await useCases.createTask.execute({ ...TASK, status: "picked", tags: ["worklog"] });
      await useCases.addUpdate.execute({ taskId: "W-1", body: "Shipped.", inSummary: false });
      await useCases.moveTask.execute({ id: "W-1", status: "done" });

      const { day, path } = await useCases.signOffDay.execute({});
      expect(day.summary).toBe("…");
      expect(files.written.get(path)).toContain("- [x] Route model calls through UMG · W-1");
   });

   it("refuses to overwrite a day file it did not write, before freezing anything", async () => {
      const { useCases, files } = makeApp();
      const path = "/reports/november 2026/03-11-2026.md";
      files.written.set(path, "# TODOs\n\n- [x] written by hand\n");

      await expect(useCases.signOffDay.execute({})).rejects.toThrow(ReportNotGeneratedError);
      expect(files.written.get(path)).toBe("# TODOs\n\n- [x] written by hand\n");
      expect((await useCases.getDay.execute({ date: "2026-11-03" })).day.isSignedOff).toBe(false);

      files.written.set(path, `${REPORT_MARKER}\n\nolder generated copy\n`);
      await expect(useCases.signOffDay.execute({})).resolves.toMatchObject({ path });
   });

   it("lists earlier days with activity that were never signed off", async () => {
      const app = makeApp("2026-11-01T06:00:00Z");
      await app.useCases.createTask.execute(TASK);
      await app.useCases.addDayNote.execute({ body: "note", date: "2026-11-02" });
      app.clock.set("2026-11-03T06:00:00Z");
      await app.useCases.signOffDay.execute({ date: "2026-11-02" });

      expect((await app.useCases.getToday.execute({})).unsignedDays).toEqual(["2026-11-01"]);
   });

   it("builds today's view", async () => {
      const { useCases } = makeApp();
      await useCases.createTask.execute({ ...TASK, status: "picked", tags: ["pfg"] });
      await useCases.createTask.execute({ ...TASK, status: "picked", blockedOn: "review" });
      await useCases.createTask.execute(TASK);
      await useCases.createTask.execute({ ...TASK, status: "picked" });
      await useCases.moveTask.execute({ id: "W-4", status: "in_review" });
      await useCases.addMeeting.execute({
         title: "Syncup",
         startsAt: "2026-11-03T08:00:00Z",
         endsAt: "2026-11-03T08:30:00Z",
      });

      const today = await useCases.getToday.execute({});
      expect(today.date).toBe("2026-11-03");
      expect(today.picked.map((g) => [g.group, g.tasks.map((t) => t.id)])).toEqual([
         ["pfg", ["W-1"]],
      ]);
      expect(today.waiting.map((t) => t.id)).toEqual(["W-2"]);
      expect(today.forReview.map((t) => t.id)).toEqual(["W-4"]);
      expect(today.backlogCount).toBe(1);
      expect(today.schedule.map((s) => s.state)).toEqual(["upcoming"]);
   });

   it("writes the today snapshot and the backup through the file writer", async () => {
      const { useCases, files } = makeApp();
      await useCases.createTask.execute(TASK);
      await useCases.writeTodaySnapshot.execute();
      const backup = await useCases.exportBackup.execute();

      expect(JSON.parse(files.written.get("/data/today.json") ?? "{}").date).toBe("2026-11-03");
      expect(backup.path).toBe("/reports/db/worklog.sql");
      expect(files.written.get(backup.path)).toContain('INSERT INTO "tasks"');
   });
});

import { describe, expect, it } from "vitest";
import { parseDayFile } from "../../src/migration/dayFile";
import { meaningOf } from "../../src/migration/lines";
import { planImport } from "../../src/migration/plan";

const IST = "Asia/Kolkata";
const day = (date: string, text: string) =>
   parseDayFile(`m/${date.split("-").reverse().join("-")}.md`, date, text);
const statusOf = (plan: ReturnType<typeof planImport>, title: string) =>
   plan.tasks.find((task) => task.title === title)?.status;

describe("meaningOf", () => {
   it("separates the title from the wait reason, drop mark and deep links", () => {
      expect(
         meaningOf("PFG layout testing - [slack](https://x.slack.com/a) ⌛ waiting on review"),
      ).toEqual({
         title: "PFG layout testing",
         blockedOn: "waiting on review",
         postponed: false,
         dropped: false,
      });
      expect(meaningOf("bug bash ⌛ postponed")).toMatchObject({
         blockedOn: null,
         postponed: true,
      });
      expect(meaningOf("old idea ❌")).toMatchObject({ title: "old idea", dropped: true });
   });
});

describe("planImport", () => {
   it("follows a carried-over line to the day it was ticked", () => {
      const plan = planImport(
         [
            day("2026-11-02", "# TODOs\n- [ ] review the PR\n"),
            day("2026-11-03", "# TODOs\n- [ ] review the PR\n"),
            day("2026-11-04", "# TODOs\n- [x] review the PR\n"),
         ],
         IST,
      );
      expect(plan.tasks).toHaveLength(1);
      expect(plan.tasks[0]).toMatchObject({ status: "done", daysSeen: 3 });
      expect(plan.ops.map((op) => op.kind)).toEqual(["create", "move"]);
   });

   it("treats a line that only gained words as the same task", () => {
      const plan = planImport(
         [
            day("2026-11-02", "# TODOs\n- [ ] reassign the artifact-refine ticket\n"),
            day(
               "2026-11-03",
               "# TODOs\n- [x] reassign the artifact-refine ticket — reassigned to the owner\n",
            ),
         ],
         IST,
      );
      expect(plan.tasks).toHaveLength(1);
      expect(plan.tasks[0].status).toBe("done");
   });

   it("drops an unticked line on the day it vanished, but not across a file with no checkboxes", () => {
      const plan = planImport(
         [
            day("2026-11-02", "# TODOs\n- [ ] kept\n- [ ] forgotten\n"),
            day("2026-11-03", "# Summary\n- notes only\n"),
            day("2026-11-04", "# TODOs\n- [ ] kept\n"),
         ],
         IST,
      );
      expect(statusOf(plan, "kept")).toBe("picked");
      expect(statusOf(plan, "forgotten")).toBe("dropped");
   });

   it("turns a timed meeting line into a meeting, not a task", () => {
      const plan = planImport(
         [
            day(
               "2026-11-02",
               "# TODOs\n- [x] syncup at 1:30pm 🕜 - [meeting](https://zoom.us/j/1)\n",
            ),
         ],
         IST,
      );
      expect(plan.tasks).toHaveLength(0);
      expect(plan.meetings).toEqual([
         {
            date: "2026-11-02",
            startsAt: new Date("2026-11-02T08:00:00Z"),
            title: "syncup at 1:30pm",
            joinUrl: "https://zoom.us/j/1",
            cancelled: false,
         },
      ]);
   });

   it("keeps every day file as notes and its Summary as the frozen one", () => {
      const plan = planImport([day("2026-11-02", "# TODOs\n- [ ] a\n\n# Summary\n- did a\n")], IST);
      expect(plan.days[0].summary).toBe("- did a");
      expect(plan.days[0].notes[0]).toContain("# Summary\n- did a");
   });
});

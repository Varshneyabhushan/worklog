import { describe, expect, it } from "vitest";
import { dateOfFile, parseDayFile } from "../../src/migration/dayFile";

const FILE = `# TODOs

- [x] syncup at 1:30pm 🕜 - [meeting](https://zoom.us/j/1)

## Skill Evaluations
- [ ] experiment with gpt-6-luna
  - [x] join the call
    - [ ] deeper step
  - grader detail that is only a note

# Backlog

## Worklog skill
- [ ] fix the committing flow

# Signing in

- [x] activate role

# Summary

- shipped a thing
`;

describe("parseDayFile", () => {
   const day = parseDayFile("november 2026/02-11-2026.md", "2026-11-02", FILE);

   it("reads checkboxes with their area, backlog flag, sub-items and notes", () => {
      expect(
         day.items.map((item) => [item.text.slice(0, 20), item.checked, item.backlog, item.area]),
      ).toEqual([
         ["syncup at 1:30pm 🕜 ", true, false, null],
         ["experiment with gpt-", false, false, "Skill Evaluations"],
         ["fix the committing f", false, true, "Worklog skill"],
      ]);
      const experiment = day.items[1];
      expect(experiment.children.map((child) => child.text)).toEqual([
         "join the call",
         "deeper step",
      ]);
      expect(experiment.notes).toEqual(["grader detail that is only a note"]);
      expect(experiment.children[1].notes).toEqual([]);
   });

   it("keeps the Summary verbatim and skips the sign-in checklist", () => {
      expect(day.summary).toBe("- shipped a thing");
      expect(day.items.some((item) => item.text === "activate role")).toBe(false);
   });

   it("reads checkboxes in the older free-form files too", () => {
      const old = parseDayFile(
         "nov 2025/28-11-2025.md",
         "2025-11-28",
         "### TODOs\n\n- [x] finish the merge\n\n#### Notes\n- [ ] check the flaky tests\n",
      );
      expect(old.items.map((item) => [item.text, item.checked, item.area])).toEqual([
         ["finish the merge", true, null],
         ["check the flaky tests", false, null],
      ]);
      expect(old.summary).toBeNull();
   });

   it("dates a file by its DD-MM-YYYY prefix", () => {
      expect(dateOfFile("29-11-2025 (sat).md")).toBe("2025-11-29");
      expect(dateOfFile("checklist.md")).toBeNull();
   });
});

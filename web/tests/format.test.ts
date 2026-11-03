import { describe, expect, it } from "vitest";
import { age, chip, longDay, shortDate } from "../src/shared/format";
import type { Task } from "../src/shared/types";

const task = (sourceKey: string | null) => ({ sourceKey }) as Task;

describe("format", () => {
   it("writes dates the worklog way", () => {
      expect(shortDate("2026-11-03")).toBe("03-11");
      expect(shortDate("2026-11-02T20:00:00.000Z", "Asia/Kolkata")).toBe("03-11");
      expect(longDay("2026-11-03")).toBe("Tuesday, 3 November");
   });

   it("gives coarse ages", () => {
      const now = new Date("2026-11-03T12:00:00Z");
      expect(age("2026-11-03T11:20:00Z", now)).toBe("40m");
      expect(age("2026-11-03T07:00:00Z", now)).toBe("5h");
      expect(age("2026-10-31T12:00:00Z", now)).toBe("3d");
   });

   it("names a task by its ticket or PR", () => {
      expect(chip(task("linear:FDE-447"))).toBe("FDE-447");
      expect(chip(task("gh:owner/worklog#31"))).toBe("worklog#31");
      expect(chip(task("pipeline:1545"))).toBeNull();
      expect(chip(task(null))).toBeNull();
   });
});

import { describe, expect, it } from "vitest";
import { TaskEvent, type TaskEventData, type TaskStatus } from "../../src/entities/task";

const event = (data: TaskEventData) =>
   new TaskEvent({
      id: 1,
      at: new Date("2026-11-03T04:00:00Z"),
      by: "routine",
      reverts: null,
      data,
   });
const statusChange = (from: TaskStatus, to: TaskStatus) =>
   event({ kind: "status_changed", from, to });

describe("task events", () => {
   it("marks a move out of done or dropped as a reopen", () => {
      expect(statusChange("done", "picked").isReopen).toBe(true);
      expect(statusChange("dropped", "backlog").isReopen).toBe(true);
      expect(statusChange("picked", "done").isReopen).toBe(false);
      expect(event({ kind: "update_added", updateId: 4 }).isReopen).toBe(false);
   });

   it("knows which status it leaves the task in", () => {
      expect(event({ kind: "created", status: "backlog" }).enters).toBe("backlog");
      expect(statusChange("picked", "done").enters).toBe("done");
      expect(event({ kind: "update_added", updateId: 4 }).enters).toBeNull();
   });

   it("keeps isReopen when serialised", () => {
      expect(JSON.parse(JSON.stringify(statusChange("done", "picked"))).isReopen).toBe(true);
   });
});

import { describe, expect, it } from "vitest";
import { describeEvent, timeline } from "../src/web/history";
import type { TaskEvent } from "../src/shared/types";

const event = (data: TaskEvent["data"], extra: Partial<TaskEvent> = {}): TaskEvent => ({
   id: 1,
   at: "2026-11-03T05:00:00.000Z",
   by: "self",
   reverts: null,
   isReopen: false,
   data,
   ...extra,
});

describe("history", () => {
   it("describes status and field changes", () => {
      expect(describeEvent(event({ kind: "status_changed", from: "picked", to: "done" }))).toBe(
         "moved: Picked to Done",
      );
      expect(
         describeEvent(
            event({ kind: "status_changed", from: "done", to: "picked" }, { isReopen: true }),
         ),
      ).toBe("reopened: Done to Picked");
      expect(
         describeEvent(
            event({ kind: "field_changed", field: "blockedOn", from: null, to: "Rohit" }),
         ),
      ).toBe("waiting on Rohit");
      expect(
         describeEvent(
            event(
               { kind: "field_changed", field: "priority", from: "normal", to: "high" },
               { reverts: 4 },
            ),
         ),
      ).toBe("undid a change: priority: normal to high");
   });

   it("shows an update once, as the update itself", () => {
      const entries = timeline(
         [
            event({ kind: "created", status: "picked" }),
            event({ kind: "update_added", updateId: 7 }),
         ],
         [
            {
               id: 7,
               taskId: "W-1",
               body: "done the thing",
               by: "self",
               at: "2026-11-03T06:00:00.000Z",
            },
         ],
      );
      expect(entries.map((entry) => entry.kind)).toEqual(["event", "update"]);
   });
});

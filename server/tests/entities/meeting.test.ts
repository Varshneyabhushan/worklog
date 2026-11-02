import { describe, expect, it } from "vitest";
import { Meeting, MeetingInvariantError } from "../../src/entities/meeting";
import { assertValidMeeting } from "../../src/entities/meeting/validation";

const at = (iso: string) => new Date(iso);

const syncup = new Meeting({
   id: 1,
   startsAt: at("2026-11-03T08:00:00Z"),
   endsAt: at("2026-11-03T08:45:00Z"),
   title: "Custom agents syncup",
   joinUrl: "https://zoom.us/j/123",
   source: "calendar",
   cancelled: false,
});

describe("meeting timing", () => {
   it("is upcoming, then in progress, then over", () => {
      const before = at("2026-11-03T07:59:00Z");
      const during = at("2026-11-03T08:10:00Z");
      const after = at("2026-11-03T08:45:00Z");

      expect([syncup.hasStarted(before), syncup.isOver(before)]).toEqual([false, false]);
      expect([syncup.hasStarted(during), syncup.isOver(during)]).toEqual([true, false]);
      expect([syncup.hasStarted(after), syncup.isOver(after)]).toEqual([true, true]);
   });

   it("treats a meeting with no end as over once it starts", () => {
      const call = new Meeting({ ...syncup, endsAt: null, source: "manual" });
      expect(call.isOver(at("2026-11-03T08:00:00Z"))).toBe(true);
   });
});

describe("meeting invariants", () => {
   it("accepts a valid meeting", () => {
      expect(() => assertValidMeeting(syncup)).not.toThrow();
      expect(() =>
         assertValidMeeting({ ...syncup, endsAt: null, joinUrl: null, source: "manual" }),
      ).not.toThrow();
   });

   it.each([
      ["an end before the start", { ...syncup, endsAt: at("2026-11-03T07:00:00Z") }, "endsAt"],
      ["empty title", { ...syncup, title: "" }, "title"],
      ["non-http join link", { ...syncup, joinUrl: "zoom:123" }, "joinUrl"],
      ["unknown source", { ...syncup, source: "teams" as "manual" }, "source"],
   ])("rejects %s", (_name, bad, field) => {
      try {
         assertValidMeeting(bad);
         expect.fail("expected an invariant error");
      } catch (err) {
         expect(err).toBeInstanceOf(MeetingInvariantError);
         expect((err as MeetingInvariantError).field).toBe(field);
      }
   });
});

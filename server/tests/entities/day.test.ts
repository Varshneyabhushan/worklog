import { describe, expect, it } from "vitest";
import { Day, DayInvariantError, DayNote } from "../../src/entities/day";
import { assertValidDay, assertValidNote } from "../../src/entities/day/validation";

const SIGNED_OFF_AT = new Date("2026-11-02T12:00:00Z");
const NOTE_AT = new Date("2026-11-03T05:00:00Z");
const openDay = Day.open("2026-11-03");
const signedOff = Day.open("2026-11-02").signOff("# Summary\n- shipped", SIGNED_OFF_AT);

describe("days", () => {
   it("is signed off once it has a frozen summary", () => {
      expect(openDay.isSignedOff).toBe(false);
      expect(signedOff.isSignedOff).toBe(true);
      expect(() => assertValidDay(openDay)).not.toThrow();
      expect(() => assertValidDay(signedOff)).not.toThrow();
   });

   it("signs off into a new day, replacing any earlier summary and keeping its notes", () => {
      const first = openDay
         .addNote("Bug bash moved to Thursday.", NOTE_AT)
         .signOff("v1", SIGNED_OFF_AT);
      const again = first.signOff("v2", new Date("2026-11-03T12:00:00Z"));
      expect(openDay.isSignedOff).toBe(false);
      expect(first.summary).toBe("v1");
      expect(again.summary).toBe("v2");
      expect(again.notes.map((note) => note.body)).toEqual(["Bug bash moved to Thursday."]);
   });

   it("keeps isSignedOff when serialised", () => {
      expect(JSON.parse(JSON.stringify(signedOff))).toEqual({
         date: "2026-11-02",
         summary: "# Summary\n- shipped",
         signedOffAt: SIGNED_OFF_AT.toISOString(),
         notes: [],
         isSignedOff: true,
      });
   });

   it("refuses a summary without a sign-off, and the reverse", () => {
      expect(() => assertValidDay({ ...openDay, summary: "x" })).toThrow(DayInvariantError);
      expect(() => assertValidDay({ ...signedOff, summary: null })).toThrow(DayInvariantError);
   });

   it("refuses an impossible date", () => {
      expect(() => assertValidDay(Day.open("2026-11-31"))).toThrow(DayInvariantError);
   });
});

describe("day notes", () => {
   it("adds a note to the day, unsaved until the repository writes it", () => {
      const day = openDay.addNote("Bug bash moved to Thursday.", NOTE_AT);
      expect(openDay.notes).toHaveLength(0);
      expect(day.notes).toHaveLength(1);
      expect(day.unsavedNotes).toEqual([
         new DayNote({ id: null, body: "Bug bash moved to Thursday.", createdAt: NOTE_AT }),
      ]);
   });

   it("may be added to an earlier day", () => {
      const backdated = signedOff.addNote("Forgot: demo went well.", NOTE_AT);
      expect(backdated.date).toBe("2026-11-02");
      expect(backdated.notes[0].createdAt).toEqual(NOTE_AT);
   });

   it.each([
      ["empty body", { id: 1, body: " ", createdAt: NOTE_AT }],
      ["long body", { id: 1, body: "x".repeat(20_001), createdAt: NOTE_AT }],
   ])("rejects %s", (_name, bad) => {
      expect(() => assertValidNote(bad)).toThrow(DayInvariantError);
      expect(() => assertValidDay({ ...openDay, notes: [new DayNote(bad)] })).toThrow(
         DayInvariantError,
      );
   });
});

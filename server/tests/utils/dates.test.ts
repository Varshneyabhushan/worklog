import { describe, expect, it } from "vitest";
import { daysBetween, isLocalDate, localDateOf, localTimeOf } from "../../src/utils/dates";

const IST = "Asia/Kolkata";

describe("isLocalDate", () => {
   it.each(["2026-11-03", "2028-02-29"])("accepts %s", (value) => {
      expect(isLocalDate(value)).toBe(true);
   });

   it.each(["2026-02-30", "2027-02-29", "03-11-2026", "2026-11-3", ""])("rejects %s", (value) => {
      expect(isLocalDate(value)).toBe(false);
   });
});

describe("localDateOf / localTimeOf", () => {
   it("uses the given time zone, not UTC", () => {
      const lateEvening = new Date("2026-11-02T19:00:00Z");
      expect(localDateOf(lateEvening, IST)).toBe("2026-11-03");
      expect(localTimeOf(lateEvening, IST)).toBe("00:30");
   });

   it("formats midnight as 00, not 24", () => {
      expect(localTimeOf(new Date("2026-11-02T18:30:00Z"), IST)).toBe("00:00");
   });
});

describe("daysBetween", () => {
   it("counts calendar days in either direction", () => {
      expect(daysBetween("2026-10-30", "2026-11-03")).toBe(4);
      expect(daysBetween("2026-11-03", "2026-10-30")).toBe(-4);
      expect(daysBetween("2026-11-03", "2026-11-03")).toBe(0);
   });
});

import { Update, type UpdateProps } from "../../src/entities/update";

export function makeUpdate(overrides: Partial<UpdateProps> = {}): Update {
   return new Update({
      id: 1,
      taskId: "W-1",
      body: "Moved the judge calls to UMG.",
      by: "self",
      at: new Date("2026-11-02T06:00:00Z"),
      inSummary: true,
      ...overrides,
   });
}

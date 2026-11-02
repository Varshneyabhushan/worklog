import { describe, expect, it } from "vitest";
import { TASK, makeApp } from "../fakes/app";

describe("search", () => {
   it("finds tasks, updates and notes by word prefix, and points updates at their task", async () => {
      const { useCases } = makeApp();
      await useCases.createTask.execute(TASK);
      await useCases.addUpdate.execute({
         taskId: "W-1",
         body: "Regraded with the new judge model.",
      });
      await useCases.addDayNote.execute({ body: "Judging panel moved to Friday." });

      const hits = await useCases.search.execute({ query: "judg" });
      expect(hits.map((hit) => [hit.kind, hit.taskId]).sort()).toEqual([
         ["note", null],
         ["task", "W-1"],
         ["update", "W-1"],
      ]);
      expect(await useCases.search.execute({ query: "regraded", kinds: ["note"] })).toHaveLength(0);
   });

   it("treats FTS operators in the query as plain words", async () => {
      const { useCases } = makeApp();
      await useCases.createTask.execute(TASK);
      expect(await useCases.search.execute({ query: 'UMG" (' })).toHaveLength(1);
      await expect(useCases.search.execute({ query: "NEAR( * OR" })).resolves.toEqual([]);
   });
});

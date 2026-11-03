import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import SqliteBackupSource from "../../../src/persistence/sqlite/backup";
import { MIGRATIONS } from "../../../src/persistence/sqlite/schema";
import SqliteSearchIndex from "../../../src/persistence/sqlite/search";
import { TASK, makeApp } from "../../fakes/app";

describe("SQL dump", () => {
   it("rebuilds the same rows and a working search index", async () => {
      const { db, useCases } = makeApp();
      await useCases.createTask.execute({ ...TASK, tags: ["evals"] });
      await useCases.addUpdate.execute({ taskId: "W-1", body: "It's done: 62 calls succeeded." });
      await useCases.addDayNote.execute({ body: "Bug bash moved to Thursday." });

      const restored = new Database(":memory:");
      restored.exec(new SqliteBackupSource(db).dumpSql());

      for (const table of ["tasks", "task_events", "updates", "days", "day_notes"]) {
         expect(restored.prepare(`SELECT * FROM ${table}`).all()).toEqual(
            db.prepare(`SELECT * FROM ${table}`).all(),
         );
      }
      expect(restored.pragma("user_version", { simple: true })).toBe(MIGRATIONS.length);
      expect(new SqliteSearchIndex(restored).search("thursday", ["note"], 5)).toHaveLength(1);
   });
});

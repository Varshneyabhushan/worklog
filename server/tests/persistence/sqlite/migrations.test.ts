import fs from "fs";
import os from "os";
import path from "path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { openDatabase } from "../../../src/persistence/sqlite/database";
import { MIGRATIONS } from "../../../src/persistence/sqlite/schema";
import SqliteUpdateRepository from "../../../src/persistence/sqlite/updates";

describe("migrations", () => {
   it("keeps every update posted before remarks existed in the Summary", () => {
      const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "worklog-db-")), "v1.db");
      const v1 = new Database(file);
      v1.exec(MIGRATIONS[0]);
      v1.pragma("user_version = 1");
      v1.exec(`
         INSERT INTO tasks (id, title, description, status, priority, tags, links, assignee)
         VALUES ('W-1', 't', 'd', 'picked', 'normal', '[]', '[]', 'self');
         INSERT INTO updates (task_id, body, by, at) VALUES ('W-1', 'old', 'self', '2026-11-02T06:00:00.000Z');
      `);
      v1.close();

      const db = openDatabase(file);
      expect(db.pragma("user_version", { simple: true })).toBe(MIGRATIONS.length);
      expect(new SqliteUpdateRepository(db).getById(1)?.inSummary).toBe(true);
   });
});

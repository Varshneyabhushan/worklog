import pino from "pino";
import { createUseCases } from "../../src/app";
import type { Clock } from "../../src/integrations/Clock";
import type { FileWriter } from "../../src/integrations/FileSystem";
import { openDatabase, type Db } from "../../src/persistence/sqlite/database";

export const IST = "Asia/Kolkata";

export class FakeClock implements Clock {
   constructor(public current: Date) {}

   now(): Date {
      return this.current;
   }

   set(iso: string): void {
      this.current = new Date(iso);
   }
}

export class MemoryFiles implements FileWriter {
   readonly written = new Map<string, string>();

   writeAtomic(filePath: string, content: string): void {
      this.written.set(filePath, content);
   }
}

export interface TestApp {
   db: Db;
   clock: FakeClock;
   files: MemoryFiles;
   useCases: ReturnType<typeof createUseCases>;
}

/** The real wiring over an in-memory database, at 10:00 IST on 03-11-2026 unless told otherwise. */
export function makeApp(nowIso = "2026-11-03T04:30:00Z"): TestApp {
   const db = openDatabase(":memory:");
   const clock = new FakeClock(new Date(nowIso));
   const files = new MemoryFiles();
   const useCases = createUseCases({
      db,
      clock,
      files,
      logger: pino({ level: "silent" }),
      timeZone: IST,
      reportRoot: "/reports",
      snapshotPath: "/data/today.json",
      backupPath: "/reports/db/worklog.sql",
   });
   return { db, clock, files, useCases };
}

export const TASK = {
   title: "Route model calls through UMG",
   description: "Move the judge and actor calls to UMG.",
};

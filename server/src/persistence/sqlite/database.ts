import Database from "better-sqlite3";
import { MIGRATIONS } from "./schema";

export type Db = Database.Database;

export function openDatabase(path: string): Db {
   const db = new Database(path);
   db.pragma("journal_mode = WAL");
   db.pragma("foreign_keys = ON");
   migrate(db);
   return db;
}

function migrate(db: Db): void {
   const version = db.pragma("user_version", { simple: true }) as number;
   for (let next = version; next < MIGRATIONS.length; next++) {
      db.transaction(() => {
         db.exec(MIGRATIONS[next]);
         db.pragma(`user_version = ${next + 1}`);
      })();
   }
}

export function placeholders(values: readonly unknown[]): string {
   return values.map(() => "?").join(", ");
}

export function toIso(date: Date | null): string | null {
   return date === null ? null : date.toISOString();
}

export function fromIso(value: string | null): Date | null {
   return value === null ? null : new Date(value);
}

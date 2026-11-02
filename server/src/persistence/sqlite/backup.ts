import type { BackupSource } from "../../services/backup/models";
import type { Db } from "./database";

interface SchemaObject {
   type: "table" | "index" | "trigger" | "view";
   name: string;
   sql: string;
}

export default class SqliteBackupSource implements BackupSource {
   constructor(private readonly db: Db) {}

   dumpSql(): string {
      const objects = (
         this.db
            .prepare(
               "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY rowid",
            )
            .all() as SchemaObject[]
      ).filter((object) => !isInternal(object.name));

      const ofType = (type: SchemaObject["type"]) =>
         objects.filter((object) => object.type === type);
      const plainTables = ofType("table").filter((table) => !/^CREATE VIRTUAL/i.test(table.sql));

      // triggers go in before the rows, so restoring the rows rebuilds the search index
      const lines = ["PRAGMA foreign_keys = OFF;", "BEGIN TRANSACTION;"];
      for (const object of [...ofType("table"), ...ofType("index"), ...ofType("trigger")]) {
         lines.push(`${object.sql};`);
      }
      for (const table of plainTables) {
         for (const row of this.db
            .prepare(`SELECT * FROM "${table.name}"`)
            .raw()
            .all() as unknown[][]) {
            lines.push(`INSERT INTO "${table.name}" VALUES (${row.map(toSqlLiteral).join(", ")});`);
         }
      }
      const version = this.db.pragma("user_version", { simple: true }) as number;
      lines.push(`PRAGMA user_version = ${version};`, "COMMIT;", "");
      return lines.join("\n");
   }
}

// sqlite's own objects and the FTS5 shadow tables behind `search`
function isInternal(name: string): boolean {
   return name.startsWith("sqlite_") || /^search_(data|idx|content|docsize|config)$/.test(name);
}

function toSqlLiteral(value: unknown): string {
   if (value === null || value === undefined) return "NULL";
   if (typeof value === "number" || typeof value === "bigint") return String(value);
   if (Buffer.isBuffer(value)) return `X'${value.toString("hex")}'`;
   return `'${String(value).replace(/'/g, "''")}'`;
}

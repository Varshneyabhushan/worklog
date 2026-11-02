import type { BackupSource } from "./models";

export class BackupService {
   constructor(private readonly source: BackupSource) {}

   dumpSql(): string {
      return this.source.dumpSql();
   }
}

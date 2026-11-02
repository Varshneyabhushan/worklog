import type { FileWriter } from "../../integrations/FileSystem";
import type { BackupService } from "../../services/backup";

export default class ExportBackupUseCase {
   constructor(
      private readonly backup: BackupService,
      private readonly files: FileWriter,
      private readonly backupPath: string,
   ) {}

   async execute(): Promise<{ path: string; bytes: number }> {
      const sql = this.backup.dumpSql();
      this.files.writeAtomic(this.backupPath, sql);
      return { path: this.backupPath, bytes: Buffer.byteLength(sql) };
   }
}

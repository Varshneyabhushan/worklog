import fs from "fs";
import path from "path";

export interface FileWriter {
   read(filePath: string): string | null;
   writeAtomic(filePath: string, content: string): void;
}

export default class FileSystem implements FileWriter {
   read(filePath: string): string | null {
      try {
         return fs.readFileSync(filePath, "utf-8");
      } catch (err) {
         if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
         throw err;
      }
   }

   // the report folder is on /mnt/c where an editor may hold the file open; only a rename survives that
   writeAtomic(filePath: string, content: string): void {
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      const temp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
      fs.writeFileSync(temp, content, "utf-8");
      fs.renameSync(temp, filePath);
   }
}

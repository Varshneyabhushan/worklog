import dotenv from "dotenv";
import os from "os";
import path from "path";
import { toNumber } from "../utils/conversions";

dotenv.config();

function required(name: string): string {
   const value = process.env[name];
   if (value === undefined || value.trim() === "") {
      throw new Error(`${name} is required; see sample.env`);
   }
   return value;
}

const dataDir = process.env.WORKLOG_DATA_DIR ?? path.join(os.homedir(), ".local/share/worklog");
const reportRoot = required("WORKLOG_REPORT_ROOT");

export const config = {
   host: process.env.WORKLOG_HOST ?? "127.0.0.1",
   port: toNumber(process.env.WORKLOG_PORT, 8765),
   logLevel: process.env.LOG_LEVEL ?? "info",
   timeZone: process.env.WORKLOG_TIME_ZONE ?? "Asia/Kolkata",
   dataDir,
   databasePath: path.join(dataDir, "worklog.db"),
   snapshotPath: path.join(dataDir, "today.json"),
   reportRoot,
   backupPath: process.env.WORKLOG_BACKUP_PATH ?? path.join(reportRoot, "db", "worklog.sql"),
   snapshotRefreshMs: toNumber(process.env.WORKLOG_SNAPSHOT_REFRESH_MS, 60_000),
};

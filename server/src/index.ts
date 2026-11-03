import crypto from "crypto";
import fs from "fs";
import http from "http";
import path from "path";
import pino from "pino";
import { createMcpRouter } from "./adapters/mcp";
import createHttpApp from "./adapters/http";
import { startTodaySnapshotWorker } from "./adapters/workers/todaySnapshot";
import { createUseCases } from "./app";
import { config } from "./config";
import SystemClock from "./integrations/Clock";
import FileSystem from "./integrations/FileSystem";
import { openDatabase } from "./persistence/sqlite/database";

const logger = pino({ level: config.logLevel });

function main() {
   const { version } = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf-8"),
   ) as { version: string };

   fs.mkdirSync(config.dataDir, { recursive: true });
   const db = openDatabase(config.databasePath);
   logger.info(`✅ database ${config.databasePath}`);

   const useCases = createUseCases({
      db,
      clock: new SystemClock(),
      files: new FileSystem(),
      logger,
      timeZone: config.timeZone,
      reportRoot: config.reportRoot,
      snapshotPath: config.snapshotPath,
      backupPath: config.backupPath,
   });

   const webDir = path.join(__dirname, "..", "..", "web", "dist");
   const app = createHttpApp({
      useCases,
      logger,
      host: config.host,
      mcpRouter: createMcpRouter({
         useCases,
         logger,
         version,
         app: {
            htmlPath: path.join(webDir, "mcp", "mcp-app.html"),
            reviewKey: crypto.randomBytes(16).toString("hex"),
         },
      }),
      staticDir: fs.existsSync(webDir) ? webDir : null,
   });

   const stopSnapshots = startTodaySnapshotWorker({
      watchChanges: useCases.watchChanges,
      writeTodaySnapshot: useCases.writeTodaySnapshot,
      logger,
      refreshMs: config.snapshotRefreshMs,
   });

   const server = http.createServer(app);
   server.listen(config.port, config.host, () =>
      logger.info(`✅ listening on http://${config.host}:${config.port} (MCP at /mcp)`),
   );

   const shutdown = (signal: string) => {
      logger.info(`received ${signal}, shutting down`);
      stopSnapshots();
      server.close(() => {
         db.close();
         process.exit(0);
      });
      setTimeout(() => process.exit(1), 5000).unref();
   };
   process.on("SIGINT", () => shutdown("SIGINT"));
   process.on("SIGTERM", () => shutdown("SIGTERM"));
}

process.on("unhandledRejection", (reason) => logger.error({ err: reason }, "unhandled rejection"));
process.on("uncaughtException", (err) => logger.fatal({ err }, "uncaught exception"));

try {
   main();
} catch (err) {
   logger.fatal({ err }, "failed to start");
   process.exit(1);
}

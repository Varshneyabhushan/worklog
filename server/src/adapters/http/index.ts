import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import express, { type Express, type Router } from "express";
import type { Logger } from "pino";
import { fail } from "./respond";
import { createDaysRouter, type DaysRouterDependencies } from "./routes/days.router";
import { createEventsRouter, type EventsRouterDependencies } from "./routes/events.router";
import { createMeetingsRouter, type MeetingsRouterDependencies } from "./routes/meetings.router";
import { createTasksRouter, type TasksRouterDependencies } from "./routes/tasks.router";
import { createUpdatesRouter, type UpdatesRouterDependencies } from "./routes/updates.router";
import { createViewsRouter, type ViewsRouterDependencies } from "./routes/views.router";

export type HttpUseCases = TasksRouterDependencies &
   UpdatesRouterDependencies &
   DaysRouterDependencies &
   MeetingsRouterDependencies &
   ViewsRouterDependencies &
   EventsRouterDependencies;

export interface HttpDependencies {
   useCases: HttpUseCases;
   logger: Logger;
   /** The bound host; a loopback host turns on the SDK's DNS-rebinding Host check. */
   host: string;
   mcpRouter: Router;
   /** Built web UI to serve at /, when present. */
   staticDir: string | null;
}

export default function createHttpApp(deps: HttpDependencies): Express {
   const { useCases, logger } = deps;
   const app = createMcpExpressApp({ host: deps.host });

   app.get("/health", (_req, res) => {
      res.json({ data: { status: "ok" } });
   });

   app.use("/mcp", deps.mcpRouter);
   app.use("/events", createEventsRouter(useCases));
   app.use("/api/tasks", createTasksRouter(useCases, logger));
   app.use("/api/updates", createUpdatesRouter(useCases, logger));
   app.use("/api/days", createDaysRouter(useCases, logger));
   app.use("/api/meetings", createMeetingsRouter(useCases, logger));
   app.use("/api", createViewsRouter(useCases, logger));

   if (deps.staticDir !== null) app.use(express.static(deps.staticDir));

   app.use((req, res) => {
      fail(res, 404, { code: "NOT_FOUND", message: `no route ${req.method} ${req.path}` });
   });

   return app;
}

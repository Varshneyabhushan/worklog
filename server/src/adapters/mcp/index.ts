import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Router, type Request, type Response } from "express";
import type { Logger } from "pino";
import { registerTodayView, type McpAppOptions } from "./app";
import { registerTools } from "./tools";
import type { McpUseCases } from "./useCases";

export type { McpUseCases } from "./useCases";

export interface McpDependencies {
   useCases: McpUseCases;
   logger: Logger;
   version: string;
   app?: McpAppOptions;
}

export function createMcpServer(deps: McpDependencies): McpServer {
   const server = new McpServer({ name: "worklog", version: deps.version });
   registerTools(server, deps.useCases, deps.logger);
   if (deps.app) registerTodayView(server, deps.useCases, deps.app, deps.logger);
   return server;
}

/** Stateless streamable HTTP: a fresh server and transport per request, so nothing is held between calls. */
export function createMcpRouter(deps: McpDependencies): Router {
   const router = Router();

   router.post("/", async (req, res) => {
      const server = createMcpServer(deps);
      const transport = new StreamableHTTPServerTransport({
         sessionIdGenerator: undefined,
         enableJsonResponse: true,
      });
      res.on("close", () => {
         void transport.close();
         void server.close();
      });
      try {
         await server.connect(transport);
         await transport.handleRequest(req, res, req.body);
      } catch (err) {
         deps.logger.error({ err }, "mcp request failed");
         if (!res.headersSent) {
            res.status(500).json({
               jsonrpc: "2.0",
               error: { code: -32603, message: "Internal error" },
               id: null,
            });
         }
      }
   });

   const notAllowed = (_req: Request, res: Response) =>
      res.status(405).json({
         jsonrpc: "2.0",
         error: { code: -32000, message: "Method not allowed: this server is stateless" },
         id: null,
      });
   router.get("/", notAllowed);
   router.delete("/", notAllowed);

   return router;
}

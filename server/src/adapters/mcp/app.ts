import fs from "fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "pino";
import { z } from "zod";
import { DecideReviewSchema } from "../../useCases/decideReview/schema";
import { runUseCase } from "./tools";
import type { McpUseCases } from "./useCases";

export const TODAY_VIEW_URI = "ui://worklog/today.html";
const VIEW_MIME_TYPE = "text/html;profile=mcp-app";
export const REVIEW_KEY_PLACEHOLDER = "__WORKLOG_REVIEW_KEY__";

export interface McpAppOptions {
   /** The single-file build of the view; the view is offered only while this file exists. */
   htmlPath: string;
   reviewKey: string;
}

const DecideReviewToolSchema = DecideReviewSchema.extend({ key: z.string() });

/**
 * Hosts hide `visibility: ["app"]` tools from the model, but a host without MCP Apps lists every
 * tool; the key, written into the view's HTML, keeps decide_review out of reach there too.
 */
export function registerTodayView(
   server: McpServer,
   useCases: McpUseCases,
   options: McpAppOptions,
   logger: Logger,
): void {
   if (!fs.existsSync(options.htmlPath)) return;

   server.registerResource(
      "today",
      TODAY_VIEW_URI,
      { mimeType: VIEW_MIME_TYPE, description: "Today's worklog as an interactive view." },
      () => ({
         contents: [
            {
               uri: TODAY_VIEW_URI,
               mimeType: VIEW_MIME_TYPE,
               text: fs
                  .readFileSync(options.htmlPath, "utf-8")
                  .replace(REVIEW_KEY_PLACEHOLDER, options.reviewKey),
            },
         ],
      }),
   );

   server.registerTool(
      "show_today",
      {
         description:
            "Show the user today's worklog as an interactive view, with the review queue they decide on.",
         _meta: { ui: { resourceUri: TODAY_VIEW_URI }, "ui/resourceUri": TODAY_VIEW_URI },
      },
      () => runUseCase(useCases.getToday, {}, "show_today", logger),
   );

   server.registerTool(
      "decide_review",
      {
         description: "The user's decision on a task in review. Called by the worklog view only.",
         inputSchema: DecideReviewToolSchema,
         _meta: { ui: { visibility: ["app"] } },
      },
      ({ key, ...decision }): Promise<CallToolResult> | CallToolResult => {
         if (key !== options.reviewKey) {
            return {
               isError: true,
               content: [{ type: "text", text: "Only the worklog view can decide a review." }],
            };
         }
         return runUseCase(useCases.decideReview, decision, "decide_review", logger);
      },
   );
}

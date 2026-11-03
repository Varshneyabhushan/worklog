import fs from "fs";
import os from "os";
import path from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import pino from "pino";
import { describe, expect, it } from "vitest";
import { createMcpServer } from "../../src/adapters/mcp";
import { REVIEW_KEY_PLACEHOLDER, TODAY_VIEW_URI } from "../../src/adapters/mcp/app";
import { TASK, makeApp } from "../fakes/app";

const viewHtml = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "worklog-view-")), "app.html");
fs.writeFileSync(viewHtml, `<meta name="review-key" content="${REVIEW_KEY_PLACEHOLDER}">`);

async function connect(htmlPath = viewHtml) {
   const { useCases } = makeApp();
   const server = createMcpServer({
      useCases,
      logger: pino({ level: "silent" }),
      version: "test",
      app: { htmlPath, reviewKey: "k1" },
   });
   const client = new Client({ name: "test", version: "test" });
   const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
   await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
   return client;
}

const text = (result: unknown) =>
   (result as { content: { type: string; text: string }[] }).content[0].text;

describe("MCP adapter", () => {
   it("offers the review decision to the view only", async () => {
      const client = await connect();
      const tools = (await client.listTools()).tools;
      const forModel = tools.filter(
         (tool) => !(tool._meta?.ui as { visibility?: string[] } | undefined)?.visibility,
      );
      expect(forModel.map((tool) => tool.name)).toContain("create_task");
      expect(forModel.some((tool) => tool.name.includes("review"))).toBe(false);
      expect(tools.find((tool) => tool.name === "decide_review")?._meta).toEqual({
         ui: { visibility: ["app"] },
      });
   });

   it("links show_today to the view, served with the review key written in", async () => {
      const client = await connect();
      const show = (await client.listTools()).tools.find((tool) => tool.name === "show_today");
      expect(show?._meta?.ui).toEqual({ resourceUri: TODAY_VIEW_URI });

      const view = await client.readResource({ uri: TODAY_VIEW_URI });
      expect(view.contents[0]).toMatchObject({ mimeType: "text/html;profile=mcp-app" });
      expect((view.contents[0] as { text: string }).text).toContain('content="k1"');
   });

   it("leaves the view out until it is built", async () => {
      const client = await connect(path.join(os.tmpdir(), "no-such-view.html"));
      const names = (await client.listTools()).tools.map((tool) => tool.name);
      expect(names).not.toContain("show_today");
      expect(names).not.toContain("decide_review");
   });

   it("decides a review only with the view's key", async () => {
      const client = await connect();
      await client.callTool({ name: "create_task", arguments: TASK });
      await client.callTool({ name: "move_task", arguments: { id: "W-1", status: "in_review" } });

      const refused = await client.callTool({
         name: "decide_review",
         arguments: { id: "W-1", decision: "done", key: "guess" },
      });
      expect(refused.isError).toBe(true);

      const decided = await client.callTool({
         name: "decide_review",
         arguments: { id: "W-1", decision: "done", key: "k1" },
      });
      expect(JSON.parse(text(decided)).status).toBe("done");
   });

   it("runs a use case and returns its result as JSON", async () => {
      const client = await connect();
      const created = await client.callTool({ name: "create_task", arguments: TASK });
      expect(JSON.parse(text(created))).toMatchObject({ id: "W-1", status: "backlog" });

      const today = await client.callTool({ name: "get_today", arguments: {} });
      expect(JSON.parse(text(today)).backlogCount).toBe(1);
   });

   it("accepts arguments the SDK has already parsed, such as a meeting's instants", async () => {
      const client = await connect();
      const result = await client.callTool({
         name: "add_meeting",
         arguments: { title: "Syncup", startsAt: "2026-11-03T08:00:00+05:30" },
      });
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(text(result)).startsAt).toBe("2026-11-03T02:30:00.000Z");
   });

   it("reports a domain error as a tool error", async () => {
      const client = await connect();
      const result = await client.callTool({ name: "get_task", arguments: { id: "W-9" } });
      expect(result.isError).toBe(true);
      expect(text(result)).toBe("TaskNotFoundError: no task W-9");
   });
});

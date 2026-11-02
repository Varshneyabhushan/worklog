import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import pino from "pino";
import { describe, expect, it } from "vitest";
import { createMcpServer } from "../../src/adapters/mcp";
import { TASK, makeApp } from "../fakes/app";

async function connect() {
   const { useCases } = makeApp();
   const server = createMcpServer({ useCases, logger: pino({ level: "silent" }), version: "test" });
   const client = new Client({ name: "test", version: "test" });
   const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
   await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
   return client;
}

const text = (result: unknown) =>
   (result as { content: { type: string; text: string }[] }).content[0].text;

describe("MCP adapter", () => {
   it("offers every tool except the review decision, which stays with the UI", async () => {
      const client = await connect();
      const names = (await client.listTools()).tools.map((tool) => tool.name);
      expect(names).toContain("create_task");
      expect(names).toContain("get_today");
      expect(names.some((name) => name.includes("review"))).toBe(false);
   });

   it("runs a use case and returns its result as JSON", async () => {
      const client = await connect();
      const created = await client.callTool({ name: "create_task", arguments: TASK });
      expect(JSON.parse(text(created))).toMatchObject({ id: "W-1", status: "backlog" });

      const today = await client.callTool({ name: "get_today", arguments: {} });
      expect(JSON.parse(text(today)).backlogCount).toBe(1);
   });

   it("reports a domain error as a tool error", async () => {
      const client = await connect();
      const result = await client.callTool({ name: "get_task", arguments: { id: "W-9" } });
      expect(result.isError).toBe(true);
      expect(text(result)).toBe("TaskNotFoundError: no task W-9");
   });
});

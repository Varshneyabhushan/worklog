import { Router } from "express";
import pino from "pino";
import request from "supertest";
import { describe, expect, it } from "vitest";
import createHttpApp from "../../src/adapters/http";
import { TASK, makeApp } from "../fakes/app";

function http() {
   const { useCases } = makeApp();
   return createHttpApp({
      useCases,
      logger: pino({ level: "silent" }),
      host: "127.0.0.1",
      mcpRouter: Router(),
      staticDir: null,
   });
}

describe("HTTP adapter", () => {
   it("answers /health", async () => {
      await request(http())
         .get("/health")
         .expect(200, { data: { status: "ok" } });
   });

   it("creates and reads a task in the data envelope", async () => {
      const app = http();
      const created = await request(app).post("/api/tasks").send(TASK).expect(201);
      expect(created.body.data).toMatchObject({ id: "W-1", status: "backlog", isOpen: true });
      const fetched = await request(app).get("/api/tasks/W-1").expect(200);
      expect(fetched.body.data.task.id).toBe("W-1");
   });

   it("maps errors to the error envelope", async () => {
      const app = http();
      const missing = await request(app).get("/api/tasks/W-9").expect(404);
      expect(missing.body.error.code).toBe("TASK_NOT_FOUND");

      const invalid = await request(app)
         .post("/api/tasks")
         .send({ ...TASK, title: "" })
         .expect(400);
      expect(invalid.body.error).toMatchObject({ code: "TASK_INVARIANT", field: "title" });

      await request(app).post("/api/tasks").send(TASK).expect(201);
      const notInReview = await request(app)
         .post("/api/tasks/W-1/review")
         .send({ decision: "done" })
         .expect(409);
      expect(notInReview.body.error.code).toBe("TASK_NOT_IN_REVIEW");

      const unknown = await request(app).get("/nope").expect(404);
      expect(unknown.body.error.code).toBe("NOT_FOUND");
   });

   it("lets the UI decide a review", async () => {
      const app = http();
      await request(app)
         .post("/api/tasks")
         .send({ ...TASK, status: "picked" })
         .expect(201);
      await request(app).post("/api/tasks/W-1/move").send({ status: "in_review" }).expect(200);
      const done = await request(app)
         .post("/api/tasks/W-1/review")
         .send({ decision: "done" })
         .expect(200);
      expect(done.body.data.status).toBe("done");
   });

   it("refuses a request whose Host header isn't loopback", async () => {
      await request(http()).get("/health").set("Host", "evil.example.com").expect(403);
   });
});

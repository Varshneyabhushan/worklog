import { describe, expect, it } from "vitest";
import { InvalidStatusTransitionError } from "../../src/entities/task";
import { InvalidCreateTaskInputError } from "../../src/useCases/createTask/errors";
import { TaskNotInReviewError } from "../../src/useCases/decideReview/errors";
import { TaskAwaitsReviewError } from "../../src/useCases/moveTask/errors";
import { TASK, makeApp } from "../fakes/app";

describe("task use cases", () => {
   it("creates a task, normalising tags and taking the source key from a ticket link", async () => {
      const { useCases } = makeApp();
      const task = await useCases.createTask.execute({
         ...TASK,
         tags: ["Skill Evaluations", "skill_evaluations"],
         links: [{ kind: "ticket", url: "https://linear.app/acme/issue/ABC-447/some-title" }],
      });
      expect(task.id).toBe("W-1");
      expect(task.tags).toEqual(["skill-evaluations"]);
      expect(task.sourceKey).toBe("linear:ABC-447");
      expect(task.status).toBe("backlog");
   });

   it("rejects malformed input with every issue in one message", async () => {
      const { useCases } = makeApp();
      await expect(useCases.createTask.execute({ title: 3 })).rejects.toThrow(
         InvalidCreateTaskInputError,
      );
   });

   it("logs unplanned work as a done task with its first update", async () => {
      const { useCases } = makeApp();
      const { task, update } = await useCases.logWork.execute({
         ...TASK,
         update: "Raised the PR; 62 UMG calls succeeded.",
      });
      expect(task.status).toBe("done");
      expect(update.taskId).toBe(task.id);
      expect(task.events.at(-1)?.data).toEqual({ kind: "update_added", updateId: update.id });
   });

   it("leaves a task in review to the user's decision", async () => {
      const { useCases } = makeApp();
      await useCases.createTask.execute({ ...TASK, status: "picked" });
      await useCases.moveTask.execute({ id: "W-1", status: "in_review" });

      await expect(useCases.moveTask.execute({ id: "W-1", status: "done" })).rejects.toThrow(
         TaskAwaitsReviewError,
      );
      const back = await useCases.decideReview.execute({
         id: "W-1",
         decision: "picked",
         comment: "Handle the missing secret case too.",
      });
      expect(back.status).toBe("picked");
      expect((await useCases.getTask.execute({ id: "W-1" })).updates.map((u) => u.body)).toEqual([
         "Handle the missing secret case too.",
      ]);
      await expect(useCases.decideReview.execute({ id: "W-1", decision: "done" })).rejects.toThrow(
         TaskNotInReviewError,
      );
   });

   it("reopens a done task with the reason as an update", async () => {
      const { useCases } = makeApp();
      await useCases.createTask.execute({ ...TASK, status: "picked" });
      await useCases.moveTask.execute({ id: "W-1", status: "done" });
      const task = await useCases.reopenTask.execute({
         id: "W-1",
         to: "picked",
         reason: "RED again since 05-11 07:00.",
         by: "routine",
      });
      expect(task.status).toBe("picked");
      expect(task.reopenCount).toBe(1);
   });

   it("upserts by source key: creates, then refreshes only title and links", async () => {
      const { useCases } = makeApp();
      const source = {
         sourceKey: "pipeline:42",
         title: "Pipeline RED",
         description: "The nightly run is failing.",
      };
      const first = await useCases.upsertTaskFromSource.execute(source);
      await useCases.editTask.execute({ id: first.task.id, priority: "high" });
      await useCases.moveTask.execute({ id: first.task.id, status: "done" });

      const again = await useCases.upsertTaskFromSource.execute({
         ...source,
         title: "Pipeline RED (4 runs)",
      });
      expect(first.created).toBe(true);
      expect(again).toMatchObject({ created: false, closed: true });
      expect(again.task.title).toBe("Pipeline RED (4 runs)");
      expect(again.task.priority).toBe("high");
   });

   it("lists tasks in plan order", async () => {
      const { useCases } = makeApp();
      await useCases.createTask.execute({ ...TASK, status: "picked", priority: "low" });
      await useCases.createTask.execute({ ...TASK, status: "picked", priority: "high" });
      await useCases.createTask.execute({ ...TASK, status: "picked", due: "2026-11-01" });
      const ids = (await useCases.listTasks.execute({ statuses: ["picked"] })).map((t) => t.id);
      expect(ids).toEqual(["W-3", "W-2", "W-1"]);
   });

   it("undoes the latest change through the use case", async () => {
      const { useCases } = makeApp();
      await useCases.createTask.execute({ ...TASK, status: "picked" });
      await useCases.editTask.execute({ id: "W-1", blockedOn: "OpenVPN access" });
      const undone = await useCases.undoTaskChange.execute({ id: "W-1" });
      expect(undone.blockedOn).toBeNull();
   });

   it("maps an illegal move to the entity's transition error", async () => {
      const { useCases } = makeApp();
      await useCases.createTask.execute(TASK);
      await useCases.moveTask.execute({ id: "W-1", status: "dropped" });
      await expect(useCases.moveTask.execute({ id: "W-1", status: "done" })).rejects.toThrow(
         InvalidStatusTransitionError,
      );
   });
});

import { describe, expect, it } from "vitest";
import { UpdateNotFoundError } from "../../src/services/update";
import { TASK, makeApp } from "../fakes/app";

async function withTwoTasks() {
   const app = makeApp();
   await app.useCases.createTask.execute({ ...TASK, status: "picked" });
   await app.useCases.createTask.execute({ ...TASK, status: "picked" });
   return app;
}

const lastEvent = async (app: Awaited<ReturnType<typeof withTwoTasks>>, id: string) =>
   (await app.useCases.getTask.execute({ id })).task.events.at(-1)?.data;

describe("update use cases", () => {
   it("records each add, edit, move and delete in the task's history", async () => {
      const app = await withTwoTasks();
      const update = await app.useCases.addUpdate.execute({ taskId: "W-1", body: "first wording" });
      expect(await lastEvent(app, "W-1")).toEqual({ kind: "update_added", updateId: update.id });

      await app.useCases.editUpdate.execute({ id: update.id, body: "second wording" });
      expect(await lastEvent(app, "W-1")).toEqual({
         kind: "update_edited",
         updateId: update.id,
         from: "first wording",
         to: "second wording",
      });

      await app.useCases.moveUpdate.execute({ id: update.id, taskId: "W-2" });
      const moved = {
         kind: "update_moved",
         updateId: update.id,
         fromTaskId: "W-1",
         toTaskId: "W-2",
      };
      expect(await lastEvent(app, "W-1")).toEqual(moved);
      expect(await lastEvent(app, "W-2")).toEqual(moved);

      await app.useCases.deleteUpdate.execute({ id: update.id });
      expect(await lastEvent(app, "W-2")).toEqual({ kind: "update_deleted", updateId: update.id });
      await expect(app.useCases.deleteUpdate.execute({ id: update.id })).rejects.toThrow(
         UpdateNotFoundError,
      );
   });

   it("moves an update in and out of the Summary, recording each change", async () => {
      const app = await withTwoTasks();
      const remark = await app.useCases.addUpdate.execute({
         taskId: "W-1",
         body: "Pipeline still red.",
         by: "routine",
         inSummary: false,
      });
      expect(remark.inSummary).toBe(false);

      const promoted = await app.useCases.editUpdate.execute({ id: remark.id, inSummary: true });
      expect(promoted).toMatchObject({ inSummary: true, body: "Pipeline still red." });
      expect(await lastEvent(app, "W-1")).toEqual({
         kind: "update_summary_changed",
         updateId: remark.id,
         inSummary: true,
      });

      const events = (await app.useCases.getTask.execute({ id: "W-1" })).task.events.length;
      await app.useCases.editUpdate.execute({ id: remark.id, inSummary: true });
      expect((await app.useCases.getTask.execute({ id: "W-1" })).task.events).toHaveLength(events);
      await expect(app.useCases.editUpdate.execute({ id: remark.id })).rejects.toThrow();
   });
});

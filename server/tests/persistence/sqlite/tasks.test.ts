import { describe, expect, it } from "vitest";
import { Task } from "../../../src/entities/task";
import { openDatabase } from "../../../src/persistence/sqlite/database";
import SqliteTaskRepository from "../../../src/persistence/sqlite/tasks";
import { makeTask } from "../../fakes/tasks";

const at = (iso: string) => new Date(iso);

function repo() {
   return new SqliteTaskRepository(openDatabase(":memory:"));
}

describe("SqliteTaskRepository", () => {
   it("stores a task with its history and hands back the saved event ids", () => {
      const tasks = repo();
      const saved = tasks.save(
         makeTask({
            tags: ["pfg"],
            links: [{ kind: "pr", url: "https://github.com/o/r/pull/1", label: null }],
         }).moveTo("done", at("2026-11-02T10:00:00Z"), "self"),
      );

      expect(saved.unsavedEvents).toEqual([]);
      expect(saved.events.map((event) => event.id)).toEqual([1, 2]);
      expect(tasks.getById("W-1")).toEqual(saved);
      expect(saved.doneAt).toEqual(at("2026-11-02T10:00:00Z"));
   });

   it("appends only new events when a stored task changes", () => {
      const tasks = repo();
      const first = tasks.save(makeTask());
      const second = tasks.save(
         first.change("priority", "high", at("2026-11-02T06:00:00Z"), "self"),
      );

      expect(second.priority).toBe("high");
      expect(second.events.map((event) => event.id)).toEqual([1, 2]);
   });

   it("filters by status, tag, assignee and parent", () => {
      const tasks = repo();
      tasks.save(makeTask({ id: "W-1", tags: ["pfg", "sfmc"] }));
      tasks.save(
         makeTask({ id: "W-2", status: "backlog", tags: ["evals"], assignee: "investigator" }),
      );
      tasks.save(makeTask({ id: "W-3", parentId: "W-1" }));

      const ids = (list: Task[]) => list.map((task) => task.id);
      expect(ids(tasks.list({ statuses: ["backlog"] }))).toEqual(["W-2"]);
      expect(ids(tasks.list({ tag: "sfmc" }))).toEqual(["W-1"]);
      expect(ids(tasks.list({ assignee: "investigator" }))).toEqual(["W-2"]);
      expect(ids(tasks.list({ parentId: "W-1" }))).toEqual(["W-3"]);
      expect(tasks.list({ ids: [] })).toEqual([]);
      expect(tasks.childCount("W-1")).toBe(1);
   });

   it("numbers new tasks after the highest id", () => {
      const tasks = repo();
      expect(tasks.nextSequence()).toBe(1);
      tasks.save(makeTask({ id: "W-7" }));
      expect(tasks.nextSequence()).toBe(8);
   });

   it("finds tasks done in a range that are still done", () => {
      const tasks = repo();
      const done = tasks.save(
         makeTask({ id: "W-1" }).moveTo("done", at("2026-11-02T10:00:00Z"), "self"),
      );
      tasks.save(
         makeTask({ id: "W-2" })
            .moveTo("done", at("2026-11-02T11:00:00Z"), "self")
            .moveTo("picked", at("2026-11-02T12:00:00Z"), "self"),
      );

      const found = tasks.doneBetween(at("2026-11-02T00:00:00Z"), at("2026-11-03T00:00:00Z"));
      expect(found.map((task) => task.id)).toEqual([done.id]);
   });

   it("purges a task with its history and updates", () => {
      const tasks = repo();
      tasks.save(makeTask());
      expect(tasks.purge("W-1")).toBe(true);
      expect(tasks.getById("W-1")).toBeNull();
      expect(tasks.purge("W-1")).toBe(false);
   });
});

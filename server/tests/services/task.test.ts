import { describe, expect, it } from "vitest";
import { InvalidStatusTransitionError, TaskUndoError } from "../../src/entities/task";
import { openDatabase } from "../../src/persistence/sqlite/database";
import SqliteTaskRepository from "../../src/persistence/sqlite/tasks";
import {
   TaskNestingError,
   TaskNotFoundError,
   TaskNotReopenableError,
   TaskParentNotFoundError,
   TaskService,
   TaskSourceKeyTakenError,
   type NewTaskFields,
} from "../../src/services/task";

const AT = new Date("2026-11-03T04:30:00Z");

const fields = (overrides: Partial<NewTaskFields> = {}): NewTaskFields => ({
   title: "Review the UMG PR",
   description: "Check the secret handling.",
   priority: "normal",
   due: null,
   blockedOn: null,
   tags: [],
   parentId: null,
   links: [],
   assignee: "self",
   sourceKey: null,
   importedFrom: null,
   ...overrides,
});

function service() {
   return new TaskService(new SqliteTaskRepository(openDatabase(":memory:")));
}

describe("TaskService", () => {
   it("numbers tasks W-1, W-2, …", () => {
      const tasks = service();
      expect(tasks.create(fields(), "backlog", AT, "self").id).toBe("W-1");
      expect(tasks.create(fields(), "picked", AT, "self").id).toBe("W-2");
   });

   it("dates a wait given at creation from its own event", () => {
      const task = service().create(fields({ blockedOn: "OpenVPN access" }), "picked", AT, "self");
      expect(task.waitingSince).toEqual(AT);
   });

   it("keeps source keys unique across all tasks, closed ones included", () => {
      const tasks = service();
      const first = tasks.create(fields({ sourceKey: "linear:ABC-1" }), "picked", AT, "self");
      tasks.move(first.id, "done", AT, "self");
      expect(() =>
         tasks.create(fields({ sourceKey: "linear:ABC-1" }), "picked", AT, "self"),
      ).toThrow(TaskSourceKeyTakenError);
   });

   it("allows one level of sub-tasks only", () => {
      const tasks = service();
      const parent = tasks.create(fields(), "picked", AT, "self");
      const child = tasks.create(fields({ parentId: parent.id }), "picked", AT, "self");

      expect(() => tasks.create(fields({ parentId: child.id }), "picked", AT, "self")).toThrow(
         TaskNestingError,
      );
      const other = tasks.create(fields(), "picked", AT, "self");
      expect(() => tasks.edit(parent.id, { parentId: other.id }, AT, "self")).toThrow(
         TaskNestingError,
      );
      expect(() => tasks.create(fields({ parentId: "W-99" }), "picked", AT, "self")).toThrow(
         TaskParentNotFoundError,
      );
   });

   it("moves, reopens and refuses what the rules forbid", () => {
      const tasks = service();
      const task = tasks.create(fields(), "picked", AT, "self");
      expect(() => tasks.reopen(task.id, "picked", AT, "self")).toThrow(TaskNotReopenableError);
      tasks.move(task.id, "done", AT, "self");
      expect(() => tasks.move(task.id, "in_review", AT, "self")).toThrow(
         InvalidStatusTransitionError,
      );
      expect(tasks.reopen(task.id, "backlog", AT, "routine").reopenCount).toBe(1);
      expect(() => tasks.get("W-99")).toThrow(TaskNotFoundError);
   });

   it("writes nothing when an edit changes nothing", () => {
      const tasks = service();
      const task = tasks.create(fields({ tags: ["pfg"] }), "picked", AT, "self");
      expect(tasks.edit(task.id, { tags: ["pfg"] }, AT, "self").events).toHaveLength(1);
   });

   it("undoes the latest change, then the one before", () => {
      const tasks = service();
      const task = tasks.create(fields(), "backlog", AT, "self");
      tasks.move(task.id, "picked", AT, "self");
      tasks.edit(task.id, { priority: "high" }, AT, "self");

      expect(tasks.undo(task.id, null, AT, "self").priority).toBe("normal");
      expect(tasks.undo(task.id, null, AT, "self").status).toBe("backlog");
      expect(() => tasks.undo(task.id, null, AT, "self")).toThrow(TaskUndoError);
   });
});

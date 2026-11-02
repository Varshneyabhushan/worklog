import { describe, expect, it } from "vitest";
import {
   InvalidStatusTransitionError,
   Task,
   TaskEvent,
   TaskInvariantError,
   canTransition,
   compareForPlan,
   formatTaskId,
   isReopen,
   isTaskId,
   normalizeTag,
   type TaskEventData,
   type TaskStatus,
} from "../../src/entities/task";
import {
   assertValidAssignee,
   assertValidDescription,
   assertValidDue,
   assertValidHistory,
   assertValidLinks,
   assertValidParent,
   assertValidSourceKey,
   assertValidTags,
   assertValidTask,
   assertValidTitle,
   assertValidTransition,
   assertValidWait,
} from "../../src/entities/task/validation";
import { CREATED_AT, makeTask } from "../fakes/tasks";

const TODAY = "2026-11-03";
const at = (iso: string) => new Date(iso);

describe("status transitions", () => {
   it.each<[TaskStatus, TaskStatus]>([
      ["backlog", "picked"],
      ["picked", "backlog"],
      ["picked", "in_review"],
      ["picked", "done"],
      ["in_review", "picked"],
      ["in_review", "done"],
      ["done", "picked"],
      ["done", "backlog"],
      ["dropped", "backlog"],
   ])("allows %s → %s", (from, to) => {
      expect(canTransition(from, to)).toBe(true);
      expect(() => assertValidTransition(from, to)).not.toThrow();
   });

   it.each<[TaskStatus, TaskStatus]>([
      ["in_review", "backlog"],
      ["done", "in_review"],
      ["done", "dropped"],
      ["dropped", "done"],
      ["picked", "picked"],
   ])("refuses %s → %s", (from, to) => {
      expect(canTransition(from, to)).toBe(false);
      expect(() => assertValidTransition(from, to)).toThrow(InvalidStatusTransitionError);
   });

   it("treats leaving done or dropped as a reopen", () => {
      expect(isReopen("done", "picked")).toBe(true);
      expect(isReopen("dropped", "backlog")).toBe(true);
      expect(isReopen("backlog", "picked")).toBe(false);
      expect(isReopen("picked", "done")).toBe(false);
   });

   it("flags a task in review, whose next move is the user's decision", () => {
      expect(makeTask({ status: "in_review" }).isInReview).toBe(true);
      expect(makeTask({ status: "picked" }).isInReview).toBe(false);
   });
});

describe("moveTo", () => {
   it("records the move as an event and leaves the original as it was", () => {
      const task = makeTask({ status: "picked" });
      const done = task.moveTo("done", at("2026-11-02T10:00:00Z"), "self");

      expect(task.status).toBe("picked");
      expect(done.status).toBe("done");
      expect(done.events.map((event) => event.data)).toEqual([
         { kind: "created", status: "picked" },
         { kind: "status_changed", from: "picked", to: "done" },
      ]);
      expect(done.unsavedEvents).toHaveLength(2);
   });

   it("refuses a move the table doesn't allow", () => {
      expect(() => makeTask({ status: "done" }).moveTo("in_review", new Date(), "self")).toThrow(
         InvalidStatusTransitionError,
      );
   });
});

describe("times come from the history", () => {
   it("takes createdAt from the created event", () => {
      expect(makeTask().createdAt).toEqual(CREATED_AT);
   });

   it("gives pickedAt only while picked, and resets it on a re-pick", () => {
      const repicked = makeTask({ status: "backlog" })
         .moveTo("picked", at("2026-11-01T05:00:00Z"), "self")
         .moveTo("backlog", at("2026-11-01T06:00:00Z"), "self")
         .moveTo("picked", at("2026-11-02T05:00:00Z"), "self");

      expect(repicked.pickedAt).toEqual(at("2026-11-02T05:00:00Z"));
      expect(repicked.moveTo("in_review", at("2026-11-02T09:00:00Z"), "self").pickedAt).toBeNull();
   });

   it("clears doneAt on a reopen and counts the reopen", () => {
      const done = makeTask().moveTo("done", at("2026-11-02T10:00:00Z"), "self");
      const reopened = done.moveTo("picked", at("2026-11-03T04:00:00Z"), "routine");

      expect(done.doneAt).toEqual(at("2026-11-02T10:00:00Z"));
      expect(reopened.doneAt).toBeNull();
      expect(reopened.reopenCount).toBe(1);
   });

   it("takes waitingSince from the change that set blockedOn", () => {
      const waiting = makeTask().change(
         "blockedOn",
         "OpenVPN access",
         at("2026-11-02T06:00:00Z"),
         "self",
      );

      expect(waiting.isWaiting).toBe(true);
      expect(waiting.waitingSince).toEqual(at("2026-11-02T06:00:00Z"));
      expect(waiting.change("blockedOn", null, new Date(), "self").waitingSince).toBeNull();
   });
});

describe("change and record", () => {
   it("records a field change with its old and new value", () => {
      const task = makeTask().change("tags", ["pfg"], at("2026-11-02T06:00:00Z"), "self");

      expect(task.tags).toEqual(["pfg"]);
      expect(task.events.at(-1)?.data).toEqual({
         kind: "field_changed",
         field: "tags",
         from: [],
         to: ["pfg"],
      });
   });

   it("writes no event when the value is already set", () => {
      const task = makeTask({ tags: ["pfg"] });
      expect(task.change("tags", ["pfg"], new Date(), "self")).toBe(task);
   });

   it("records update events without changing the task's fields", () => {
      const task = makeTask().record({ kind: "update_added", updateId: 7 }, new Date(), "self");
      expect(task.events.at(-1)?.data).toEqual({ kind: "update_added", updateId: 7 });
      expect(task.status).toBe("picked");
   });
});

describe("compareForPlan", () => {
   const sorted = (tasks: Task[]) =>
      [...tasks].sort((a, b) => compareForPlan(a, b, TODAY)).map((task) => task.id);

   it("orders overdue, due today, then high, normal, low", () => {
      const tasks = [
         makeTask({ id: "W-low", priority: "low" }),
         makeTask({ id: "W-high", priority: "high" }),
         makeTask({ id: "W-today", priority: "low", due: TODAY }),
         makeTask({ id: "W-normal" }),
         makeTask({ id: "W-overdue", priority: "low", due: "2026-11-01" }),
      ];
      expect(sorted(tasks)).toEqual(["W-overdue", "W-today", "W-high", "W-normal", "W-low"]);
   });

   it("puts the soonest due first within a priority, undated last", () => {
      const tasks = [
         makeTask({ id: "W-undated" }),
         makeTask({ id: "W-friday", due: "2026-11-06" }),
         makeTask({ id: "W-wednesday", due: "2026-11-04" }),
      ];
      expect(sorted(tasks)).toEqual(["W-wednesday", "W-friday", "W-undated"]);
   });

   it("falls back to the oldest pick, then creation", () => {
      const tasks = [
         makeTask({ id: "W-new", createdAt: at("2026-11-03T04:00:00Z") }),
         makeTask({ id: "W-backlog", status: "backlog", createdAt: at("2026-10-20T04:00:00Z") }),
         makeTask({ id: "W-old", createdAt: at("2026-10-28T04:00:00Z") }),
      ];
      expect(sorted(tasks)).toEqual(["W-backlog", "W-old", "W-new"]);
   });
});

describe("serialising", () => {
   it("keeps the derived properties and the history", () => {
      const task = makeTask({ tags: ["pfg"] }).moveTo(
         "in_review",
         at("2026-11-02T09:00:00Z"),
         "self",
      );
      expect(JSON.parse(JSON.stringify(task))).toMatchObject({
         id: "W-1",
         status: "in_review",
         isOpen: true,
         isInReview: true,
         isWaiting: false,
         displayGroup: "pfg",
         primaryLink: null,
         createdAt: CREATED_AT.toISOString(),
         pickedAt: null,
         doneAt: null,
         reopenCount: 0,
         events: [
            { id: null, data: { kind: "created", status: "picked" } },
            { id: null, data: { kind: "status_changed", from: "picked", to: "in_review" } },
         ],
      });
   });
});

describe("helpers", () => {
   it("groups by the first tag, or Other", () => {
      expect(makeTask({ tags: ["pfg", "sfmc"] }).displayGroup).toBe("pfg");
      expect(makeTask().displayGroup).toBe("Other");
   });

   it("formats and recognises task ids", () => {
      expect(formatTaskId(142)).toBe("W-142");
      expect(isTaskId("W-142")).toBe(true);
      expect(isTaskId("W-0")).toBe(false);
      expect(isTaskId("w-142")).toBe(false);
   });

   it.each([
      ["Skill Evaluations", "skill-evaluations"],
      ["  PFG ", "pfg"],
      ["custom_skills", "custom-skills"],
      ["a -- b", "a-b"],
      ["-edge-", "edge"],
   ])("normalizes %j to %j", (raw, tag) => {
      expect(normalizeTag(raw)).toBe(tag);
   });
});

describe("task invariants", () => {
   it("accepts a complete task", () => {
      const task = makeTask({
         tags: ["skill-evals"],
         links: [{ kind: "pr", url: "https://github.com/org/repo/pull/31", label: null }],
         due: "2026-11-06",
         assignee: "investigator",
         sourceKey: "gh:org/repo#31",
         parentId: "W-2",
      })
         .change("blockedOn", "OpenVPN access", at("2026-11-02T06:00:00Z"), "self")
         .moveTo("done", at("2026-11-02T10:00:00Z"), "self");
      expect(() => assertValidTask(task)).not.toThrow();
   });

   it.each([
      ["empty title", () => assertValidTitle("  "), "title"],
      ["multi-line title", () => assertValidTitle("one\ntwo"), "title"],
      ["long title", () => assertValidTitle("x".repeat(201)), "title"],
      ["empty description", () => assertValidDescription(""), "description"],
      ["non-slug tag", () => assertValidTags(["Skill Evals"]), "tags"],
      ["duplicate tag", () => assertValidTags(["pfg", "pfg"]), "tags"],
      [
         "unknown link kind",
         () => assertValidLinks([{ kind: "wiki" as "other", url: "https://x.y", label: null }]),
         "links",
      ],
      [
         "non-http link",
         () => assertValidLinks([{ kind: "other", url: "file:///etc/passwd", label: null }]),
         "links",
      ],
      ["impossible due date", () => assertValidDue("2026-02-30"), "due"],
      ["blank wait reason", () => assertValidWait(" "), "blockedOn"],
      ["bad assignee", () => assertValidAssignee("Claude Code"), "assignee"],
      ["bad source key", () => assertValidSourceKey("FDE-447"), "sourceKey"],
      ["own parent", () => assertValidParent({ id: "W-1", parentId: "W-1" }), "parentId"],
   ])("rejects %s", (_name, check, field) => {
      try {
         check();
         expect.fail("expected an invariant error");
      } catch (err) {
         expect(err).toBeInstanceOf(TaskInvariantError);
         expect((err as TaskInvariantError).field).toBe(field);
      }
   });
});

describe("history invariants", () => {
   const event = (data: TaskEventData, iso = "2026-11-02T06:00:00Z") =>
      new TaskEvent({ id: 1, at: at(iso), by: "self", reverts: null, data });
   const created = event({ kind: "created", status: "backlog" }, "2026-11-01T04:00:00Z");

   it("accepts a history that replays to the current status", () => {
      const history = [created, event({ kind: "status_changed", from: "backlog", to: "picked" })];
      expect(() => assertValidHistory(history, "picked")).not.toThrow();
   });

   it.each<[string, TaskEvent[], TaskStatus]>([
      ["an empty history", [], "backlog"],
      [
         "a history not starting with creation",
         [event({ kind: "update_added", updateId: 1 })],
         "backlog",
      ],
      ["two creations", [created, event({ kind: "created", status: "picked" })], "picked"],
      [
         "events out of time order",
         [created, event({ kind: "update_added", updateId: 1 }, "2026-10-01T00:00:00Z")],
         "backlog",
      ],
      [
         "a move from the wrong status",
         [created, event({ kind: "status_changed", from: "picked", to: "done" })],
         "done",
      ],
      [
         "a move the table forbids",
         [created, event({ kind: "status_changed", from: "backlog", to: "backlog" })],
         "backlog",
      ],
      ["a status the history never reached", [created], "picked"],
   ])("rejects %s", (_name, history, status) => {
      expect(() => assertValidHistory(history, status)).toThrow(TaskInvariantError);
   });
});

import { describe, expect, it } from "vitest";
import { planMove } from "../src/web/moves";

describe("planMove", () => {
   it("moves an open task directly", () => {
      expect(planMove("backlog", "picked")).toEqual({ kind: "move", to: "picked" });
      expect(planMove("picked", "in_review")).toEqual({ kind: "move", to: "in_review" });
   });

   it("leaves review only through the review decision", () => {
      expect(planMove("in_review", "done")).toEqual({ kind: "review", decision: "done" });
      expect(planMove("in_review", "picked")).toEqual({ kind: "review", decision: "picked" });
      expect(planMove("in_review", "backlog")?.kind).toBe("refused");
   });

   it("brings a closed task back only by reopening it", () => {
      expect(planMove("done", "picked")).toEqual({ kind: "reopen", to: "picked" });
      expect(planMove("dropped", "backlog")).toEqual({ kind: "reopen", to: "backlog" });
      expect(planMove("done", "in_review")?.kind).toBe("refused");
   });

   it("does nothing for a drop on the same column", () => {
      expect(planMove("picked", "picked")).toBeNull();
   });
});

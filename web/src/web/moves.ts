import type { TaskStatus } from "../shared/types";

export type Move =
   | { kind: "move"; to: TaskStatus }
   | { kind: "review"; decision: "done" | "picked" }
   | { kind: "reopen"; to: "picked" | "backlog" }
   | { kind: "refused"; reason: string };

/** What taking a task from one status to another means for the service, or null for no change. */
export function planMove(from: TaskStatus, to: TaskStatus): Move | null {
   if (from === to) return null;
   if (from === "in_review") {
      if (to === "done" || to === "picked") return { kind: "review", decision: to };
      return { kind: "refused", reason: "A task in review goes to done, or back to picked." };
   }
   if (from === "done" || from === "dropped") {
      if (to === "picked" || to === "backlog") return { kind: "reopen", to };
      return { kind: "refused", reason: `A ${from} task can only be reopened.` };
   }
   return { kind: "move", to };
}

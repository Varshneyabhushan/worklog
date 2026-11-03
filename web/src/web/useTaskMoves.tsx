import { useState } from "react";
import type { Task, TaskStatus } from "../shared/types";
import { useAction } from "./actions";
import { api } from "./api";
import { planMove } from "./moves";
import { PromptDialog, type PromptRequest } from "./PromptDialog";

/** Moves a task, asking for the review comment or reopen reason the service needs. */
export function useTaskMoves() {
   const act = useAction();
   const [request, setRequest] = useState<PromptRequest | null>(null);

   const perform = (task: Task, to: TaskStatus) => {
      const move = planMove(task.status, to);
      if (move === null) return;
      if (move.kind === "refused") {
         void act(() => Promise.reject(new Error(move.reason)));
      } else if (move.kind === "move") {
         void act(() => api.move(task.id, move.to));
      } else if (move.kind === "review" && move.decision === "done") {
         void act(() => api.review(task.id, "done"), `${task.id} done`);
      } else if (move.kind === "review") {
         setRequest({
            title: `Send ${task.id} back to picked`,
            label: "What is left to do",
            confirm: "Send back",
            required: true,
            onSubmit: (comment) => void act(() => api.review(task.id, "picked", comment)),
         });
      } else {
         setRequest({
            title: `Reopen ${task.id}`,
            label: "Why it is open again",
            confirm: "Reopen",
            required: true,
            onSubmit: (reason) => void act(() => api.reopen(task.id, move.to, reason)),
         });
      }
   };

   const dialog = <PromptDialog request={request} onClose={() => setRequest(null)} />;
   return { perform, dialog };
}

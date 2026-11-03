import { useQuery } from "@tanstack/react-query";
import { useState, type DragEvent } from "react";
import { TaskCard } from "../../shared/TaskCard";
import type { Task, TaskStatus } from "../../shared/types";
import { api } from "../api";
import { href } from "../router";
import { useTaskMoves } from "../useTaskMoves";

const COLUMNS: { status: TaskStatus; label: string; empty: string }[] = [
   { status: "backlog", label: "Backlog", empty: "Nothing set aside." },
   { status: "picked", label: "Picked", empty: "Drag a backlog task here to plan it." },
   { status: "in_review", label: "In review", empty: "Nothing waiting for your review." },
   { status: "done", label: "Done today", empty: "Nothing finished yet today." },
];

export function Board() {
   const open = useQuery({
      queryKey: ["tasks", "open"],
      queryFn: () => api.tasks(["backlog", "picked", "in_review"]),
   });
   const today = useQuery({ queryKey: ["today"], queryFn: api.today });
   const { perform, dialog } = useTaskMoves();
   const [dragging, setDragging] = useState<Task | null>(null);
   const [over, setOver] = useState<TaskStatus | null>(null);

   if (open.isPending || today.isPending) return <p className="muted">Loading the board…</p>;
   if (open.isError) return <p className="muted">Could not load tasks: {open.error.message}</p>;

   const now = new Date();
   const date = today.data?.date ?? "";
   const byStatus = (status: TaskStatus): Task[] =>
      status === "done"
         ? (today.data?.progress.done ?? [])
         : open.data.filter((task) => task.status === status);

   const drop = (status: TaskStatus) => (event: DragEvent) => {
      event.preventDefault();
      setOver(null);
      if (dragging) perform(dragging, status);
      setDragging(null);
   };

   return (
      <div className="board">
         {COLUMNS.map((column) => {
            const tasks = byStatus(column.status);
            return (
               <section
                  key={column.status}
                  className={`column${over === column.status ? " over" : ""}`}
                  onDragOver={(event) => {
                     event.preventDefault();
                     setOver(column.status);
                  }}
                  onDragLeave={() => setOver(null)}
                  onDrop={drop(column.status)}
               >
                  <h2>
                     {column.label} <span className="count">{tasks.length}</span>
                  </h2>
                  {tasks.length === 0 && <p className="empty">{column.empty}</p>}
                  {tasks.map((task) => (
                     <div
                        key={task.id}
                        draggable
                        onDragStart={() => setDragging(task)}
                        onDragEnd={() => setDragging(null)}
                        className={task.parentId ? "sub" : undefined}
                     >
                        <TaskCard
                           task={task}
                           today={date}
                           now={now}
                           showGroup
                           title={<a href={href.task(task.id)}>{task.title}</a>}
                        >
                           {task.isInReview && (
                              <div className="row">
                                 <button className="primary" onClick={() => perform(task, "done")}>
                                    Mark done
                                 </button>
                                 <button onClick={() => perform(task, "picked")}>Send back</button>
                              </div>
                           )}
                        </TaskCard>
                     </div>
                  ))}
               </section>
            );
         })}
         {dialog}
      </div>
   );
}

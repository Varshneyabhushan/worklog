import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { STATUS_LABELS } from "../../shared/format";
import { TaskCard } from "../../shared/TaskCard";
import { STATUSES, type TaskStatus } from "../../shared/types";
import { api } from "../api";
import { href } from "../router";

const OPEN: TaskStatus[] = ["backlog", "picked", "in_review"];

export function List() {
   const [statuses, setStatuses] = useState<TaskStatus[]>(OPEN);
   const [tag, setTag] = useState("");
   const [assignee, setAssignee] = useState("");
   const [query, setQuery] = useState("");
   const search = useDeferredValue(query.trim());

   const tasks = useQuery({ queryKey: ["tasks", "all"], queryFn: () => api.tasks() });
   const today = useQuery({ queryKey: ["today"], queryFn: api.today });
   const hits = useQuery({
      queryKey: ["search", search],
      queryFn: () => api.search(search),
      enabled: search !== "",
   });

   const all = tasks.data ?? [];
   const tags = [...new Set(all.flatMap((task) => task.tags))].sort();
   const assignees = [...new Set(all.map((task) => task.assignee))].sort();
   const matched = search === "" ? null : new Set(hits.data?.map((hit) => hit.taskId));
   const shown = all.filter(
      (task) =>
         statuses.includes(task.status) &&
         (tag === "" || task.tags.includes(tag)) &&
         (assignee === "" || task.assignee === assignee) &&
         (matched === null || matched.has(task.id)),
   );
   const notes = hits.data?.filter((hit) => hit.kind === "note") ?? [];
   const toggle = (status: TaskStatus) =>
      setStatuses((current) =>
         current.includes(status) ? current.filter((s) => s !== status) : [...current, status],
      );

   return (
      <div className="list">
         <form className="filters" role="search" onSubmit={(event) => event.preventDefault()}>
            <input
               type="search"
               placeholder="Search tasks, updates and notes"
               value={query}
               onChange={(event) => setQuery(event.target.value)}
               aria-label="Search"
            />
            <div className="statuses" role="group" aria-label="Statuses">
               {STATUSES.map((status) => (
                  <label key={status} className="toggle">
                     <input
                        type="checkbox"
                        checked={statuses.includes(status)}
                        onChange={() => toggle(status)}
                     />
                     {STATUS_LABELS[status]}
                  </label>
               ))}
            </div>
            <select value={tag} onChange={(event) => setTag(event.target.value)} aria-label="Tag">
               <option value="">Any tag</option>
               {tags.map((name) => (
                  <option key={name}>{name}</option>
               ))}
            </select>
            <select
               value={assignee}
               onChange={(event) => setAssignee(event.target.value)}
               aria-label="Assignee"
            >
               <option value="">Anyone</option>
               {assignees.map((name) => (
                  <option key={name}>{name}</option>
               ))}
            </select>
         </form>

         {tasks.isPending && <p className="muted">Loading tasks…</p>}
         <p className="muted">
            {shown.length} {shown.length === 1 ? "task" : "tasks"}
         </p>
         <div className="rows">
            {shown.map((task) => (
               <TaskCard
                  key={task.id}
                  task={task}
                  today={today.data?.date ?? ""}
                  now={new Date()}
                  showGroup
                  title={
                     <>
                        <a href={href.task(task.id)}>{task.title}</a>{" "}
                        <span className={`status-label ${task.status}`}>
                           {STATUS_LABELS[task.status]}
                        </span>
                     </>
                  }
               />
            ))}
         </div>

         {notes.length > 0 && (
            <section>
               <h2>In day notes</h2>
               {notes.map((hit) => (
                  <p key={hit.ref} className="snippet">
                     {highlight(hit.snippet)}
                  </p>
               ))}
            </section>
         )}
      </div>
   );
}

/** The search index marks each match as «match». */
function highlight(snippet: string) {
   return snippet
      .split(/«|»/)
      .map((part, index) => (index % 2 === 1 ? <mark key={index}>{part}</mark> : part));
}

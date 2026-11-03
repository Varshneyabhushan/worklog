import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { chip, localDate, localTime, shortDate, STATUS_LABELS } from "../../shared/format";
import { Markdown } from "../../shared/markdown";
import { TaskCard } from "../../shared/TaskCard";
import { PRIORITIES, type Priority, type Task, type TaskStatus } from "../../shared/types";
import { useAction } from "../actions";
import { api, type TaskPatch } from "../api";
import { timeline } from "../history";
import { href } from "../router";
import { useTaskMoves } from "../useTaskMoves";

const ACTIONS: Record<TaskStatus, { to: TaskStatus; label: string }[]> = {
   backlog: [
      { to: "picked", label: "Pick" },
      { to: "done", label: "Mark done" },
      { to: "dropped", label: "Drop" },
   ],
   picked: [
      { to: "done", label: "Mark done" },
      { to: "in_review", label: "Send to review" },
      { to: "backlog", label: "Move to backlog" },
      { to: "dropped", label: "Drop" },
   ],
   in_review: [
      { to: "done", label: "Mark done" },
      { to: "picked", label: "Send back" },
   ],
   done: [
      { to: "picked", label: "Reopen" },
      { to: "backlog", label: "Reopen to backlog" },
   ],
   dropped: [
      { to: "picked", label: "Reopen" },
      { to: "backlog", label: "Reopen to backlog" },
   ],
};

export function TaskPage({ id }: { id: string }) {
   const detail = useQuery({ queryKey: ["task", id], queryFn: () => api.task(id) });
   const today = useQuery({ queryKey: ["today"], queryFn: api.today });
   const act = useAction();
   const { perform, dialog } = useTaskMoves();

   if (detail.isPending) return <p className="muted">Loading {id}…</p>;
   if (detail.isError) return <p className="muted">{detail.error.message}</p>;

   const { task, updates, subTasks } = detail.data;
   const timeZone = today.data?.timeZone;
   const save = (patch: TaskPatch) => act(() => api.editTask(task.id, patch));
   const ref = chip(task);

   return (
      <article className="task-page">
         <div className="task-main">
            <p className="task-meta">
               <span className="stub">{task.id}</span>
               {ref && <span className="chip">{ref}</span>}
               <span className={`status-label ${task.status}`}>{STATUS_LABELS[task.status]}</span>
               {task.parentId && (
                  <span>
                     part of <a href={href.task(task.parentId)}>{task.parentId}</a>
                  </span>
               )}
            </p>
            <EditableTitle task={task} onSave={(title) => save({ title })} />
            <div className="row wrap">
               {ACTIONS[task.status].map((action) => (
                  <button
                     key={action.to}
                     className={action.to === "done" ? "primary" : undefined}
                     onClick={() => perform(task, action.to)}
                  >
                     {action.label}
                  </button>
               ))}
               <button onClick={() => act(() => api.undo(task.id), "Undone")}>
                  Undo last change
               </button>
            </div>

            <Description task={task} onSave={(description) => save({ description })} />

            {subTasks.length > 0 && (
               <section>
                  <h2>Sub-tasks</h2>
                  <div className="rows">
                     {subTasks.map((sub) => (
                        <TaskCard
                           key={sub.id}
                           task={sub}
                           today={today.data?.date ?? ""}
                           now={new Date()}
                           title={
                              <>
                                 <a href={href.task(sub.id)}>{sub.title}</a>{" "}
                                 <span className={`status-label ${sub.status}`}>
                                    {STATUS_LABELS[sub.status]}
                                 </span>
                              </>
                           }
                        />
                     ))}
                  </div>
               </section>
            )}

            <section>
               <h2>History and updates</h2>
               <ol className="timeline">
                  {timeline(task.events, updates).map((entry, index) => (
                     <li key={index} className={entry.kind}>
                        <time dateTime={entry.at} title={entry.at}>
                           {shortDate(localDate(entry.at, timeZone))}{" "}
                           {localTime(entry.at, timeZone)}
                        </time>
                        {entry.by === "routine" && <span className="by">routine</span>}
                        {entry.kind === "event" ? (
                           <span className="muted">{entry.text}</span>
                        ) : (
                           <Markdown text={entry.update.body} />
                        )}
                     </li>
                  ))}
               </ol>
               <AddUpdate
                  onAdd={(body) => act(() => api.addUpdate(task.id, body), "Update posted")}
               />
            </section>
         </div>

         <aside className="task-fields">
            <Fields task={task} onSave={save} />
            {task.links.length > 0 && (
               <section>
                  <h2>Links</h2>
                  <ul className="links">
                     {task.links.map((link) => (
                        <li key={link.url}>
                           <span className="muted">{link.kind}</span>{" "}
                           <a href={link.url} target="_blank" rel="noreferrer">
                              {link.label ?? link.url}
                           </a>
                        </li>
                     ))}
                  </ul>
               </section>
            )}
            {task.importedFrom && <p className="muted small">Imported from {task.importedFrom}</p>}
         </aside>
         {dialog}
      </article>
   );
}

function EditableTitle({ task, onSave }: { task: Task; onSave: (title: string) => void }) {
   const [draft, setDraft] = useState<string | null>(null);
   if (draft === null) {
      return (
         <h1 className="task-title">
            {task.title}{" "}
            <button className="quiet" onClick={() => setDraft(task.title)}>
               Edit title
            </button>
         </h1>
      );
   }
   return (
      <form
         className="row"
         onSubmit={(event) => {
            event.preventDefault();
            if (draft.trim() !== "" && draft !== task.title) onSave(draft.trim());
            setDraft(null);
         }}
      >
         <input
            className="title-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Title"
            autoFocus
         />
         <button type="submit" className="primary">
            Save
         </button>
         <button type="button" onClick={() => setDraft(null)}>
            Cancel
         </button>
      </form>
   );
}

function Description({ task, onSave }: { task: Task; onSave: (text: string) => Promise<boolean> }) {
   const [draft, setDraft] = useState<string | null>(null);
   if (draft === null) {
      return (
         <section className="description">
            <h2>
               Description{" "}
               <button className="quiet" onClick={() => setDraft(task.description)}>
                  Edit
               </button>
            </h2>
            <Markdown text={task.description} />
         </section>
      );
   }
   return (
      <section className="description">
         <h2>Description</h2>
         <textarea
            rows={12}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Description"
         />
         <div className="row">
            <button
               className="primary"
               disabled={draft.trim() === ""}
               onClick={async () => {
                  if (await onSave(draft)) setDraft(null);
               }}
            >
               Save description
            </button>
            <button onClick={() => setDraft(null)}>Cancel</button>
         </div>
      </section>
   );
}

function AddUpdate({ onAdd }: { onAdd: (body: string) => Promise<boolean> }) {
   const [body, setBody] = useState("");
   return (
      <form
         className="add-update"
         onSubmit={async (event) => {
            event.preventDefault();
            if (await onAdd(body.trim())) setBody("");
         }}
      >
         <textarea
            rows={3}
            placeholder="What changed? It goes into today's Summary."
            value={body}
            onChange={(event) => setBody(event.target.value)}
            aria-label="New update"
         />
         <button type="submit" className="primary" disabled={body.trim() === ""}>
            Post update
         </button>
      </form>
   );
}

function Fields({ task, onSave }: { task: Task; onSave: (patch: TaskPatch) => void }) {
   const text = (value: string) => (value.trim() === "" ? null : value.trim());
   return (
      <section className="fields">
         <Field label="Priority">
            <select
               value={task.priority}
               onChange={(event) => onSave({ priority: event.target.value as Priority })}
            >
               {PRIORITIES.map((priority) => (
                  <option key={priority}>{priority}</option>
               ))}
            </select>
         </Field>
         <Field label="Due">
            <input
               type="date"
               value={task.due ?? ""}
               onChange={(event) => onSave({ due: event.target.value || null })}
            />
         </Field>
         <Field label="Waiting on">
            <CommitInput
               value={task.blockedOn ?? ""}
               placeholder="Not waiting"
               onCommit={(value) => onSave({ blockedOn: text(value) })}
            />
         </Field>
         <Field label="Tags">
            <CommitInput
               value={task.tags.join(", ")}
               placeholder="First tag is the group"
               onCommit={(value) =>
                  onSave({
                     tags: value
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                  })
               }
            />
         </Field>
         <Field label="Assignee">
            <CommitInput
               value={task.assignee}
               onCommit={(value) => value.trim() !== "" && onSave({ assignee: value.trim() })}
            />
         </Field>
         <Field label="Created">
            <span>{shortDate(task.createdAt)}</span>
         </Field>
         {task.doneAt && (
            <Field label="Done">
               <span>{shortDate(task.doneAt)}</span>
            </Field>
         )}
      </section>
   );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
   return (
      <label className="field">
         <span className="muted">{label}</span>
         {children}
      </label>
   );
}

/** Saves on Enter or when focus leaves, and only when the value changed. */
function CommitInput(props: {
   value: string;
   placeholder?: string;
   onCommit: (value: string) => void;
}) {
   const [draft, setDraft] = useState(props.value);
   const [seen, setSeen] = useState(props.value);
   if (props.value !== seen) {
      setSeen(props.value);
      setDraft(props.value);
   }
   const commit = () => {
      if (draft !== props.value) props.onCommit(draft);
   };
   return (
      <input
         value={draft}
         placeholder={props.placeholder}
         onChange={(event) => setDraft(event.target.value)}
         onBlur={commit}
         onKeyDown={(event) => event.key === "Enter" && commit()}
      />
   );
}

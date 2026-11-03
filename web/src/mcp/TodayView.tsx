import type { App } from "@modelcontextprotocol/ext-apps";
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import { useState, type ReactNode } from "react";
import { localTime, longDay, shortDate } from "../shared/format";
import { TaskCard } from "../shared/TaskCard";
import type { Task, Today } from "../shared/types";

interface ToolResult {
   isError?: boolean;
   content?: { type: string; text?: string }[];
}

function textOf(result: ToolResult): string {
   return result.content?.find((part) => part.type === "text")?.text ?? "";
}

const reviewKey =
   document.querySelector<HTMLMetaElement>('meta[name="worklog-review-key"]')?.content ?? "";

export function TodayView() {
   const [today, setToday] = useState<Today | null>(null);
   const [error, setError] = useState<string | null>(null);
   const { app, error: connectError } = useApp({
      appInfo: { name: "worklog-today", version: "0.1.0" },
      capabilities: {},
      onAppCreated: (created) => {
         created.ontoolresult = (result) => show(result as ToolResult);
      },
   });
   useHostStyles(app);

   function show(result: ToolResult) {
      if (result.isError) return setError(textOf(result));
      setError(null);
      setToday(JSON.parse(textOf(result)) as Today);
   }

   async function refresh(current: App) {
      show((await current.callServerTool({ name: "get_today", arguments: {} })) as ToolResult);
   }

   if (connectError)
      return <p className="muted">Could not connect to Claude: {connectError.message}</p>;
   if (!today || !app) return <p className="muted">{error ?? "Loading today…"}</p>;

   const now = new Date();
   const openLink = (url: string) => void app.openLink({ url });
   const card = (task: Task, actions?: ReactNode) => (
      <TaskCard key={task.id} task={task} today={today.date} now={now} onLink={openLink}>
         {actions}
      </TaskCard>
   );

   return (
      <div className="today">
         <header className="today-head">
            <h1>{longDay(today.date)}</h1>
            <button className="quiet" onClick={() => void refresh(app)}>
               Refresh
            </button>
         </header>
         {error && <p className="banner">{error}</p>}
         {today.unsignedDays.length > 0 && (
            <p className="banner">
               Not signed off: {today.unsignedDays.map((date) => shortDate(date)).join(", ")}. Ask
               me to run the night routine for it.
            </p>
         )}

         {today.schedule.length > 0 && (
            <section>
               <h2>Schedule</h2>
               <ul className="schedule">
                  {today.schedule.map(({ meeting, state }) => (
                     <li
                        key={meeting.id}
                        className={`${state}${meeting.cancelled ? " cancelled" : ""}`}
                     >
                        <time>{localTime(meeting.startsAt, today.timeZone)}</time> {meeting.title}
                     </li>
                  ))}
               </ul>
            </section>
         )}

         {today.forReview.length > 0 && (
            <section>
               <h2>For your review</h2>
               <div className="cards">
                  {today.forReview.map((task) =>
                     card(
                        task,
                        <ReviewActions
                           task={task}
                           onDecide={async (decision, comment) => {
                              const result = (await app.callServerTool({
                                 name: "decide_review",
                                 arguments: { id: task.id, decision, comment, key: reviewKey },
                              })) as ToolResult;
                              if (result.isError) return setError(textOf(result));
                              await refresh(app);
                           }}
                        />,
                     ),
                  )}
               </div>
            </section>
         )}

         <section>
            <h2>Picked</h2>
            {today.picked.length === 0 && <p className="muted">Nothing picked for today.</p>}
            {today.picked.map((group) => (
               <div key={group.group} className="group-block">
                  <h3>{group.group}</h3>
                  <div className="cards">{group.tasks.map((task) => card(task))}</div>
               </div>
            ))}
         </section>

         {today.waiting.length > 0 && (
            <section>
               <h2>Waiting</h2>
               <div className="cards">{today.waiting.map((task) => card(task))}</div>
            </section>
         )}

         <section>
            <h2>Today's progress</h2>
            {today.progress.done.length === 0 && today.progress.updates.length === 0 && (
               <p className="muted">No updates yet today.</p>
            )}
            <ul className="progress">
               {today.progress.done.map((task) => (
                  <li key={task.id}>
                     <span className="stub">{task.id}</span> ✓ {task.title}
                  </li>
               ))}
               {today.progress.updates.map(({ task, updates }) => (
                  <li key={`u-${task.id}`}>
                     <span className="stub">{task.id}</span> {updates.length}{" "}
                     {updates.length === 1 ? "update" : "updates"} on {task.title}
                  </li>
               ))}
            </ul>
         </section>

         <p className="muted footer">
            {today.backlogCount} in the backlog
            {today.notes.length > 0 &&
               `, ${today.notes.length} ${today.notes.length === 1 ? "note" : "notes"} today`}
            .
         </p>
      </div>
   );
}

function ReviewActions(props: {
   task: Task;
   onDecide: (decision: "done" | "picked", comment?: string) => Promise<void>;
}) {
   const [sendingBack, setSendingBack] = useState(false);
   const [comment, setComment] = useState("");
   const [busy, setBusy] = useState(false);
   const decide = async (decision: "done" | "picked", text?: string) => {
      setBusy(true);
      await props.onDecide(decision, text);
      setBusy(false);
   };

   if (sendingBack) {
      return (
         <div className="review-form">
            <textarea
               rows={2}
               placeholder="What is left to do"
               value={comment}
               onChange={(event) => setComment(event.target.value)}
               aria-label={`What is left on ${props.task.id}`}
               autoFocus
            />
            <div className="row">
               <button
                  className="primary"
                  disabled={busy || comment.trim() === ""}
                  onClick={() => void decide("picked", comment.trim())}
               >
                  Send back
               </button>
               <button onClick={() => setSendingBack(false)}>Cancel</button>
            </div>
         </div>
      );
   }
   return (
      <div className="row">
         <button className="primary" disabled={busy} onClick={() => void decide("done")}>
            Mark done
         </button>
         <button disabled={busy} onClick={() => setSendingBack(true)}>
            Send back
         </button>
      </div>
   );
}

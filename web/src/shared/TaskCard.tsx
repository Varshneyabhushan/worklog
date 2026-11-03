import type { MouseEvent, ReactNode } from "react";
import { age, chip, isOverdue, shortDate } from "./format";
import type { Task } from "./types";

interface TaskCardProps {
   task: Task;
   today: string;
   now: Date;
   showGroup?: boolean;
   /** Opens a link; the MCP view routes links through the host. */
   onLink?: (url: string) => void;
   title?: ReactNode;
   children?: ReactNode;
}

export function TaskCard({ task, today, now, showGroup, onLink, title, children }: TaskCardProps) {
   const ref = chip(task);
   const link = task.primaryLink;
   const openLink = (event: MouseEvent) => {
      if (!onLink || !link) return;
      event.preventDefault();
      onLink(link.url);
   };

   return (
      <article className={`card status-${task.status}`} data-priority={task.priority}>
         <header className="card-head">
            <span className="stub">{task.id}</span>
            {ref && <span className="chip">{ref}</span>}
            {link && (
               <a
                  className="card-link"
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={openLink}
                  title={link.label ?? link.url}
               >
                  {link.kind} ↗
               </a>
            )}
            {showGroup && <span className="group">{task.displayGroup}</span>}
         </header>
         <div className="card-title">{title ?? task.title}</div>
         <Badges task={task} today={today} now={now} />
         {children}
      </article>
   );
}

function Badges({ task, today, now }: { task: Task; today: string; now: Date }) {
   const badges: ReactNode[] = [];
   if (task.isWaiting) {
      badges.push(
         <span key="wait" className="badge wait" title={task.blockedOn ?? undefined}>
            ⌛ {task.waitingSince && <b>{age(task.waitingSince, now)}</b>} {task.blockedOn}
         </span>,
      );
   }
   if (task.priority === "high")
      badges.push(
         <span key="pri" className="badge high">
            high
         </span>,
      );
   if (task.due !== null) {
      badges.push(
         <span key="due" className={`badge due${isOverdue(task, today) ? " overdue" : ""}`}>
            due {shortDate(task.due)}
         </span>,
      );
   }
   if (task.reopenCount > 0) {
      badges.push(
         <span key="reopen" className="badge" title="times reopened">
            ↺ {task.reopenCount}
         </span>,
      );
   }
   if (task.assignee !== "self") {
      badges.push(
         <span key="who" className="badge agent">
            {task.assignee}
         </span>,
      );
   }
   return badges.length > 0 ? <div className="badges">{badges}</div> : null;
}

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { longDay, shortDate } from "../shared/format";
import { api } from "./api";
import { useLiveChanges } from "./live";
import { href, useRoute, type Route } from "./router";
import { Board } from "./views/Board";
import { Days } from "./views/Days";
import { List } from "./views/List";
import { TaskPage } from "./views/TaskPage";

const NAV: { view: Route["view"]; label: string; to: string }[] = [
   { view: "board", label: "Board", to: href.board },
   { view: "list", label: "List", to: href.list },
   { view: "days", label: "Days", to: href.days() },
];

export function App() {
   useLiveChanges();
   const route = useRoute();
   const today = useQuery({ queryKey: ["today"], queryFn: api.today });
   const masthead = useStickyHeight();

   return (
      <div className="shell">
         <header className="masthead" ref={masthead}>
            <h1 className="date">{today.data ? longDay(today.data.date) : "Worklog"}</h1>
            <nav>
               {NAV.map((item) => (
                  <a
                     key={item.view}
                     href={item.to}
                     aria-current={route.view === item.view ? "page" : undefined}
                  >
                     {item.label}
                  </a>
               ))}
            </nav>
         </header>
         {today.data && today.data.unsignedDays.length > 0 && (
            <p className="banner" role="alert">
               {today.data.unsignedDays.map((date) => shortDate(date)).join(", ")}{" "}
               {today.data.unsignedDays.length === 1 ? "is" : "are"} not signed off. Run{" "}
               <code>/worklog night {formatDay(today.data.unsignedDays[0])}</code> in Claude to
               review the Summary and close {today.data.unsignedDays.length === 1 ? "it" : "them"}.
            </p>
         )}
         {today.isError && (
            <p className="banner" role="alert">
               The worklog service is not answering: {today.error.message}
            </p>
         )}
         <main>
            {route.view === "board" && <Board />}
            {route.view === "list" && <List />}
            {route.view === "task" && <TaskPage id={route.id} />}
            {route.view === "days" && <Days date={route.date} />}
         </main>
      </div>
   );
}

/** Publishes the sticky header's height as --masthead-height, for what sticks below it. */
function useStickyHeight() {
   const ref = useRef<HTMLElement>(null);
   useEffect(() => {
      const header = ref.current;
      if (!header) return;
      const observer = new ResizeObserver(() =>
         document.documentElement.style.setProperty(
            "--masthead-height",
            `${header.offsetHeight}px`,
         ),
      );
      observer.observe(header);
      return () => observer.disconnect();
   }, []);
   return ref;
}

/** "2026-11-02" → "02-11-2026", the night routine's argument. */
function formatDay(date: string): string {
   return date.split("-").reverse().join("-");
}

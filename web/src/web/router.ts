import { useEffect, useState } from "react";

export type Route =
   | { view: "board" }
   | { view: "list" }
   | { view: "task"; id: string }
   | { view: "days"; date: string | null };

export function parseRoute(hash: string): Route {
   const [view, param] = hash.replace(/^#\/?/, "").split("/");
   if (view === "list") return { view: "list" };
   if (view === "tasks" && param) return { view: "task", id: decodeURIComponent(param) };
   if (view === "days") return { view: "days", date: param ?? null };
   return { view: "board" };
}

export const href = {
   board: "#/board",
   list: "#/list",
   task: (id: string) => `#/tasks/${id}`,
   days: (date?: string) => (date ? `#/days/${date}` : "#/days"),
};

export function useRoute(): Route {
   const [route, setRoute] = useState(() => parseRoute(location.hash));
   useEffect(() => {
      const onChange = () => setRoute(parseRoute(location.hash));
      window.addEventListener("hashchange", onChange);
      return () => window.removeEventListener("hashchange", onChange);
   }, []);
   return route;
}

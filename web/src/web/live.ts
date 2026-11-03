import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/** Refetches whatever is on screen when the service reports a change, whoever made it. */
export function useLiveChanges(): void {
   const queries = useQueryClient();
   useEffect(() => {
      const events = new EventSource("/events");
      events.addEventListener("change", () => void queries.invalidateQueries());
      return () => events.close();
   }, [queries]);
}

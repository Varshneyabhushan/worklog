import { Router } from "express";
import type WatchChangesUseCase from "../../../useCases/watchChanges";

export interface EventsRouterDependencies {
   watchChanges: WatchChangesUseCase;
}

const HEARTBEAT_MS = 25_000;

/** GET /events · a server-sent event stream: one `change` event per change. */
export function createEventsRouter(deps: EventsRouterDependencies): Router {
   const router = Router();

   router.get("/", (req, res) => {
      res.writeHead(200, {
         "Content-Type": "text/event-stream",
         "Cache-Control": "no-cache",
         Connection: "keep-alive",
      });
      res.write(": connected\n\n");

      const unsubscribe = deps.watchChanges.execute((change) => {
         res.write(`event: change\ndata: ${JSON.stringify(change)}\n\n`);
      });
      const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);

      req.on("close", () => {
         clearInterval(heartbeat);
         unsubscribe();
      });
   });

   return router;
}

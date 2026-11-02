import type { Logger } from "pino";
import type WatchChangesUseCase from "../../useCases/watchChanges";
import type WriteTodaySnapshotUseCase from "../../useCases/writeTodaySnapshot";

export interface TodaySnapshotDependencies {
   watchChanges: WatchChangesUseCase;
   writeTodaySnapshot: WriteTodaySnapshotUseCase;
   logger: Logger;
   refreshMs: number;
}

const COALESCE_MS = 250;

/**
 * Keeps today.json current for the /today pane: rewritten shortly after any change, and on a
 * timer so meeting states and the date roll over. Returns the stop function.
 */
export function startTodaySnapshotWorker(deps: TodaySnapshotDependencies): () => void {
   const write = () =>
      deps.writeTodaySnapshot
         .execute()
         .catch((err) => deps.logger.error({ err }, "today snapshot failed"));

   let pending: NodeJS.Timeout | null = null;
   const unsubscribe = deps.watchChanges.execute(() => {
      if (pending !== null) return;
      pending = setTimeout(() => {
         pending = null;
         void write();
      }, COALESCE_MS);
   });
   const timer = setInterval(() => void write(), deps.refreshMs);
   void write();

   return () => {
      unsubscribe();
      clearInterval(timer);
      if (pending !== null) clearTimeout(pending);
   };
}

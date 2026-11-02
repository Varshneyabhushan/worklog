import { Router } from "express";
import type { Logger } from "pino";
import type ExportBackupUseCase from "../../../useCases/exportBackup";
import type GetTodayUseCase from "../../../useCases/getToday";
import type SearchUseCase from "../../../useCases/search";
import { handle, list } from "../handle";

export interface ViewsRouterDependencies {
   getToday: GetTodayUseCase;
   search: SearchUseCase;
   exportBackup: ExportBackupUseCase;
}

export function createViewsRouter(deps: ViewsRouterDependencies, logger: Logger): Router {
   const router = Router();

   /** GET /api/today · 200 */
   router.get(
      "/today",
      handle(logger, "GET /today", 200, () => deps.getToday.execute({})),
   );

   /** GET /api/search?q=&kinds=task,update,note&limit= · 200 · 400 */
   router.get(
      "/search",
      handle(logger, "GET /search", 200, (req) =>
         deps.search.execute({
            query: req.query.q,
            kinds: list(req.query.kinds),
            limit: req.query.limit === undefined ? undefined : Number(req.query.limit),
         }),
      ),
   );

   /** POST /api/backup · 200 */
   router.post(
      "/backup",
      handle(logger, "POST /backup", 200, () => deps.exportBackup.execute()),
   );

   return router;
}

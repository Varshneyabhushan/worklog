import { Router } from "express";
import type { Logger } from "pino";
import type AddDayNoteUseCase from "../../../useCases/addDayNote";
import type DeleteDayNoteUseCase from "../../../useCases/deleteDayNote";
import type GetDayUseCase from "../../../useCases/getDay";
import type ListDaysUseCase from "../../../useCases/listDays";
import type SignOffDayUseCase from "../../../useCases/signOffDay";
import { body, handle } from "../handle";

export interface DaysRouterDependencies {
   listDays: ListDaysUseCase;
   getDay: GetDayUseCase;
   addDayNote: AddDayNoteUseCase;
   deleteDayNote: DeleteDayNoteUseCase;
   signOffDay: SignOffDayUseCase;
}

export function createDaysRouter(deps: DaysRouterDependencies, logger: Logger): Router {
   const router = Router();

   /** GET /api/days?limit=&before= · 200 · 400 */
   router.get(
      "/",
      handle(logger, "GET /days", 200, (req) =>
         deps.listDays.execute({
            limit: req.query.limit === undefined ? undefined : Number(req.query.limit),
            before: req.query.before,
         }),
      ),
   );

   /** GET /api/days/:date · 200 · 400 */
   router.get(
      "/:date",
      handle(logger, "GET /days/:date", 200, (req) =>
         deps.getDay.execute({ date: req.params.date }),
      ),
   );

   /** POST /api/days/:date/notes · 201 · 400 */
   router.post(
      "/:date/notes",
      handle(logger, "POST /days/:date/notes", 201, (req) =>
         deps.addDayNote.execute({ ...body(req), date: req.params.date }),
      ),
   );

   /** DELETE /api/days/notes/:id · 200 · 404 (purge) */
   router.delete(
      "/notes/:id",
      handle(logger, "DELETE /days/notes/:id", 200, (req) =>
         deps.deleteDayNote.execute({ id: Number(req.params.id) }),
      ),
   );

   /** POST /api/days/:date/sign-off · 200 · 400 */
   router.post(
      "/:date/sign-off",
      handle(logger, "POST /days/:date/sign-off", 200, (req) =>
         deps.signOffDay.execute({ date: req.params.date }),
      ),
   );

   return router;
}

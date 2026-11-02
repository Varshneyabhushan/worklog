import { Router } from "express";
import type { Logger } from "pino";
import type AddMeetingUseCase from "../../../useCases/addMeeting";
import type DeleteMeetingUseCase from "../../../useCases/deleteMeeting";
import type EditMeetingUseCase from "../../../useCases/editMeeting";
import type ListMeetingsUseCase from "../../../useCases/listMeetings";
import { body, handle } from "../handle";

export interface MeetingsRouterDependencies {
   listMeetings: ListMeetingsUseCase;
   addMeeting: AddMeetingUseCase;
   editMeeting: EditMeetingUseCase;
   deleteMeeting: DeleteMeetingUseCase;
}

export function createMeetingsRouter(deps: MeetingsRouterDependencies, logger: Logger): Router {
   const router = Router();

   /** GET /api/meetings?date= · 200 · 400 */
   router.get(
      "/",
      handle(logger, "GET /meetings", 200, (req) =>
         deps.listMeetings.execute({ date: req.query.date }),
      ),
   );

   /** POST /api/meetings · 201 · 400 */
   router.post(
      "/",
      handle(logger, "POST /meetings", 201, (req) => deps.addMeeting.execute(body(req))),
   );

   /** PATCH /api/meetings/:id · 200 · 400 · 404 */
   router.patch(
      "/:id",
      handle(logger, "PATCH /meetings/:id", 200, (req) =>
         deps.editMeeting.execute({ ...body(req), id: Number(req.params.id) }),
      ),
   );

   /** DELETE /api/meetings/:id · 200 · 404 */
   router.delete(
      "/:id",
      handle(logger, "DELETE /meetings/:id", 200, (req) =>
         deps.deleteMeeting.execute({ id: Number(req.params.id) }),
      ),
   );

   return router;
}

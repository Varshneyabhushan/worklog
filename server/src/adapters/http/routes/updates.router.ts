import { Router } from "express";
import type { Logger } from "pino";
import type DeleteUpdateUseCase from "../../../useCases/deleteUpdate";
import type EditUpdateUseCase from "../../../useCases/editUpdate";
import type MoveUpdateUseCase from "../../../useCases/moveUpdate";
import { body, handle } from "../handle";

export interface UpdatesRouterDependencies {
   editUpdate: EditUpdateUseCase;
   moveUpdate: MoveUpdateUseCase;
   deleteUpdate: DeleteUpdateUseCase;
}

export function createUpdatesRouter(deps: UpdatesRouterDependencies, logger: Logger): Router {
   const router = Router();

   /** PATCH /api/updates/:id · 200 · 400 · 404 */
   router.patch(
      "/:id",
      handle(logger, "PATCH /updates/:id", 200, (req) =>
         deps.editUpdate.execute({ ...body(req), id: Number(req.params.id) }),
      ),
   );

   /** POST /api/updates/:id/move · 200 · 400 · 404 */
   router.post(
      "/:id/move",
      handle(logger, "POST /updates/:id/move", 200, (req) =>
         deps.moveUpdate.execute({ ...body(req), id: Number(req.params.id) }),
      ),
   );

   /** DELETE /api/updates/:id · 200 · 404 */
   router.delete(
      "/:id",
      handle(logger, "DELETE /updates/:id", 200, (req) =>
         deps.deleteUpdate.execute({ id: Number(req.params.id) }),
      ),
   );

   return router;
}

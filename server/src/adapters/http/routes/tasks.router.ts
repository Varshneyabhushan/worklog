import { Router } from "express";
import type { Logger } from "pino";
import type CreateTaskUseCase from "../../../useCases/createTask";
import type DecideReviewUseCase from "../../../useCases/decideReview";
import type EditTaskUseCase from "../../../useCases/editTask";
import type GetTaskUseCase from "../../../useCases/getTask";
import type ListTasksUseCase from "../../../useCases/listTasks";
import type LogWorkUseCase from "../../../useCases/logWork";
import type MoveTaskUseCase from "../../../useCases/moveTask";
import type PurgeTaskUseCase from "../../../useCases/purgeTask";
import type ReopenTaskUseCase from "../../../useCases/reopenTask";
import type UndoTaskChangeUseCase from "../../../useCases/undoTaskChange";
import type UpsertTaskFromSourceUseCase from "../../../useCases/upsertTaskFromSource";
import type AddUpdateUseCase from "../../../useCases/addUpdate";
import { body, handle, list } from "../handle";

export interface TasksRouterDependencies {
   createTask: CreateTaskUseCase;
   logWork: LogWorkUseCase;
   getTask: GetTaskUseCase;
   listTasks: ListTasksUseCase;
   editTask: EditTaskUseCase;
   moveTask: MoveTaskUseCase;
   decideReview: DecideReviewUseCase;
   reopenTask: ReopenTaskUseCase;
   upsertTaskFromSource: UpsertTaskFromSourceUseCase;
   undoTaskChange: UndoTaskChangeUseCase;
   purgeTask: PurgeTaskUseCase;
   addUpdate: AddUpdateUseCase;
}

export function createTasksRouter(deps: TasksRouterDependencies, logger: Logger): Router {
   const router = Router();

   /** GET /api/tasks?statuses=picked,backlog&tag=&assignee=&parentId= · 200 · 400 */
   router.get(
      "/",
      handle(logger, "GET /tasks", 200, (req) =>
         deps.listTasks.execute({
            statuses: list(req.query.statuses),
            tag: req.query.tag,
            assignee: req.query.assignee,
            parentId: req.query.parentId,
         }),
      ),
   );

   /** POST /api/tasks · 201 · 400 · 404 parent · 409 source key or nesting */
   router.post(
      "/",
      handle(logger, "POST /tasks", 201, (req) => deps.createTask.execute(body(req))),
   );

   /** POST /api/tasks/log-work · 201 · 400 · 404 · 409 */
   router.post(
      "/log-work",
      handle(logger, "POST /tasks/log-work", 201, (req) => deps.logWork.execute(body(req))),
   );

   /** PUT /api/tasks/by-source · 200 · 400 */
   router.put(
      "/by-source",
      handle(logger, "PUT /tasks/by-source", 200, (req) =>
         deps.upsertTaskFromSource.execute(body(req)),
      ),
   );

   /** GET /api/tasks/:id · 200 · 404 */
   router.get(
      "/:id",
      handle(logger, "GET /tasks/:id", 200, (req) => deps.getTask.execute({ id: req.params.id })),
   );

   /** PATCH /api/tasks/:id · 200 · 400 · 404 · 409 */
   router.patch(
      "/:id",
      handle(logger, "PATCH /tasks/:id", 200, (req) =>
         deps.editTask.execute({ ...body(req), id: req.params.id }),
      ),
   );

   /** DELETE /api/tasks/:id · 200 · 404 (purge: the task, its history and updates) */
   router.delete(
      "/:id",
      handle(logger, "DELETE /tasks/:id", 200, (req) =>
         deps.purgeTask.execute({ id: req.params.id }),
      ),
   );

   /** POST /api/tasks/:id/move · 200 · 400 · 404 · 409 transition, or task in review */
   router.post(
      "/:id/move",
      handle(logger, "POST /tasks/:id/move", 200, (req) =>
         deps.moveTask.execute({ ...body(req), id: req.params.id }),
      ),
   );

   /** POST /api/tasks/:id/review · 200 · 400 · 404 · 409 not in review */
   router.post(
      "/:id/review",
      handle(logger, "POST /tasks/:id/review", 200, (req) =>
         deps.decideReview.execute({ ...body(req), id: req.params.id }),
      ),
   );

   /** POST /api/tasks/:id/reopen · 200 · 400 · 404 · 409 still open */
   router.post(
      "/:id/reopen",
      handle(logger, "POST /tasks/:id/reopen", 200, (req) =>
         deps.reopenTask.execute({ ...body(req), id: req.params.id }),
      ),
   );

   /** POST /api/tasks/:id/undo · 200 · 404 · 409 nothing to undo, or moved on since */
   router.post(
      "/:id/undo",
      handle(logger, "POST /tasks/:id/undo", 200, (req) =>
         deps.undoTaskChange.execute({ ...body(req), id: req.params.id }),
      ),
   );

   /** POST /api/tasks/:id/updates · 201 · 400 · 404 */
   router.post(
      "/:id/updates",
      handle(logger, "POST /tasks/:id/updates", 201, (req) =>
         deps.addUpdate.execute({ ...body(req), taskId: req.params.id }),
      ),
   );

   return router;
}

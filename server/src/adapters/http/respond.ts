import type { Response } from "express";
import type { Logger } from "pino";
import { InvalidStatusTransitionError } from "../../entities/task";
import {
   ConflictError,
   InvalidInputError,
   InvariantError,
   NotFoundError,
} from "../../utils/errors";

export interface ApiError {
   code: string;
   message: string;
   field?: string;
}

export function ok(res: Response, status: number, data: unknown): void {
   res.status(status).json({ data });
}

export function fail(res: Response, status: number, error: ApiError): void {
   res.status(status).json({ error });
}

/** TaskNotFoundError → TASK_NOT_FOUND: the class name is the stable code. */
export function errorCode(err: Error): string {
   return err.name
      .replace(/Error$/, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .toUpperCase();
}

export function errorStatus(err: unknown): number {
   if (err instanceof InvalidInputError) return 400;
   if (err instanceof InvalidStatusTransitionError) return 409;
   if (err instanceof InvariantError) return 400;
   if (err instanceof NotFoundError) return 404;
   if (err instanceof ConflictError) return 409;
   return 500;
}

export function sendError(res: Response, err: unknown, route: string, logger: Logger): void {
   const status = errorStatus(err);
   if (status === 500 || !(err instanceof Error)) {
      logger.error({ err, route }, "request failed");
      return fail(res, 500, { code: "INTERNAL_SERVER_ERROR", message: "Something went wrong." });
   }
   fail(res, status, {
      code: errorCode(err),
      message: err.message,
      ...(err instanceof InvariantError ? { field: err.field } : {}),
   });
}

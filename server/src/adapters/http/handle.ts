import type { Request, Response } from "express";
import type { Logger } from "pino";
import { ok, sendError } from "./respond";

export function handle(
   logger: Logger,
   route: string,
   status: number,
   call: (req: Request) => Promise<unknown>,
) {
   return async (req: Request, res: Response) => {
      try {
         ok(res, status, await call(req));
      } catch (err) {
         sendError(res, err, route, logger);
      }
   };
}

export function body(req: Request): Record<string, unknown> {
   return (req.body as Record<string, unknown> | undefined) ?? {};
}

export function list(value: unknown): string[] | undefined {
   return typeof value === "string" && value !== "" ? value.split(",") : undefined;
}

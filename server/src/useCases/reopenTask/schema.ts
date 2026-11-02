import { z } from "zod";
import { ActorSchema, TaskIdSchema } from "../shared/schemas";

export const ReopenTaskSchema = z.object({
   id: TaskIdSchema,
   to: z.enum(["picked", "backlog"]),
   reason: z.string(),
   by: ActorSchema,
});

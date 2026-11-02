import { z } from "zod";
import { ActorSchema, TaskIdSchema } from "../shared/schemas";

export const MoveUpdateSchema = z.object({
   id: z.number().int().positive(),
   taskId: TaskIdSchema,
   by: ActorSchema,
});

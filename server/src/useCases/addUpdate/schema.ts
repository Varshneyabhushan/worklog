import { z } from "zod";
import { ActorSchema, TaskIdSchema } from "../shared/schemas";

export const AddUpdateSchema = z.object({
   taskId: TaskIdSchema,
   body: z.string(),
   by: ActorSchema,
});

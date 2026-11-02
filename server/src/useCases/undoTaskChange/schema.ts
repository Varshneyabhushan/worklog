import { z } from "zod";
import { ActorSchema, TaskIdSchema } from "../shared/schemas";

export const UndoTaskChangeSchema = z.object({
   id: TaskIdSchema,
   /** Omitted: the latest change that can be undone. */
   eventId: z.number().int().positive().optional(),
   by: ActorSchema,
});

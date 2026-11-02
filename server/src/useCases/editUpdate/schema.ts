import { z } from "zod";
import { ActorSchema } from "../shared/schemas";

export const EditUpdateSchema = z.object({
   id: z.number().int().positive(),
   body: z.string(),
   by: ActorSchema,
});

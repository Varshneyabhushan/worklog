import { z } from "zod";
import { ActorSchema } from "../shared/schemas";

export const EditUpdateSchema = z
   .object({
      id: z.number().int().positive(),
      body: z.string().optional(),
      inSummary: z.boolean().optional(),
      by: ActorSchema,
   })
   .refine((input) => input.body !== undefined || input.inSummary !== undefined, {
      error: "give a body, inSummary, or both",
   });

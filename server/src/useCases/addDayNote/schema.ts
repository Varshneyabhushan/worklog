import { z } from "zod";
import { LocalDateSchema } from "../shared/schemas";

export const AddDayNoteSchema = z.object({
   body: z.string(),
   /** Omitted: today. An earlier day is allowed. */
   date: LocalDateSchema.optional(),
});

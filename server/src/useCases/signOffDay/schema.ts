import { z } from "zod";
import { LocalDateSchema } from "../shared/schemas";

export const SignOffDaySchema = z.object({
   /** Omitted: today. */
   date: LocalDateSchema.optional(),
});

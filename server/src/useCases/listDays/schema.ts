import { z } from "zod";
import { LocalDateSchema } from "../shared/schemas";

export const ListDaysSchema = z.object({
   limit: z.number().int().min(1).max(366).default(30),
   /** Days strictly before this date, for paging back. */
   before: LocalDateSchema.optional(),
});

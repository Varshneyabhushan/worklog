import { z } from "zod";
import { LocalDateSchema } from "../shared/schemas";

export const ListMeetingsSchema = z.object({
   /** Omitted: today. */
   date: LocalDateSchema.optional(),
});

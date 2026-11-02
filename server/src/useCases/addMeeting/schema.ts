import { z } from "zod";
import { InstantSchema } from "../shared/schemas";

export const AddMeetingSchema = z.object({
   title: z.string(),
   startsAt: InstantSchema,
   endsAt: InstantSchema.nullable().default(null),
   joinUrl: z.string().nullable().default(null),
   source: z.enum(["calendar", "manual"]).default("manual"),
});

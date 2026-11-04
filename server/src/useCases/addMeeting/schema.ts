import { z } from "zod";
import { ClearableTextSchema, InstantSchema } from "../shared/schemas";

export const AddMeetingSchema = z.object({
   title: z.string(),
   startsAt: InstantSchema,
   endsAt: InstantSchema.nullable().default(null),
   joinUrl: ClearableTextSchema.default(null),
   source: z.enum(["calendar", "manual"]).default("manual"),
});

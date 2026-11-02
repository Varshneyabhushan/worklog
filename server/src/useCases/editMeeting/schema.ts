import { z } from "zod";
import { InstantSchema } from "../shared/schemas";

export const EditMeetingSchema = z.object({
   id: z.number().int().positive(),
   title: z.string().optional(),
   startsAt: InstantSchema.optional(),
   endsAt: InstantSchema.nullable().optional(),
   joinUrl: z.string().nullable().optional(),
   cancelled: z.boolean().optional(),
});

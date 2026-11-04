import { z } from "zod";
import { ClearableTextSchema, InstantSchema } from "../shared/schemas";

export const EditMeetingSchema = z.object({
   id: z.number().int().positive(),
   title: z.string().optional(),
   startsAt: InstantSchema.optional(),
   endsAt: InstantSchema.nullable().optional(),
   joinUrl: ClearableTextSchema.optional(),
   cancelled: z.boolean().optional(),
});

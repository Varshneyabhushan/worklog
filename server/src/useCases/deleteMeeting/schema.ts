import { z } from "zod";

export const DeleteMeetingSchema = z.object({ id: z.number().int().positive() });

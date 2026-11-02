import { z } from "zod";

export const DeleteDayNoteSchema = z.object({ id: z.number().int().positive() });

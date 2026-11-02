import { z } from "zod";
import { TaskIdSchema } from "../shared/schemas";

export const DecideReviewSchema = z.object({
   id: TaskIdSchema,
   decision: z.enum(["done", "picked"]),
   comment: z.string().optional(),
});

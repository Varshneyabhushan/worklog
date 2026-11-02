import { z } from "zod";
import { normalizeTag } from "../../entities/task";
import { StatusSchema, TaskIdSchema } from "../shared/schemas";

export const ListTasksSchema = z.object({
   statuses: z.array(StatusSchema).optional(),
   tag: z.string().transform(normalizeTag).optional(),
   assignee: z.string().optional(),
   parentId: TaskIdSchema.optional(),
});

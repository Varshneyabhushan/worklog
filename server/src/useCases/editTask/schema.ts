import { z } from "zod";
import {
   ActorSchema,
   LinksSchema,
   LocalDateSchema,
   PrioritySchema,
   TagsSchema,
   TaskIdSchema,
} from "../shared/schemas";

export const EditTaskSchema = z.object({
   id: TaskIdSchema,
   title: z.string().optional(),
   description: z.string().optional(),
   priority: PrioritySchema.optional(),
   due: LocalDateSchema.nullable().optional(),
   blockedOn: z.string().nullable().optional(),
   tags: TagsSchema.optional(),
   parentId: TaskIdSchema.nullable().optional(),
   links: LinksSchema.optional(),
   assignee: z.string().optional(),
   sourceKey: z.string().nullable().optional(),
   by: ActorSchema,
});

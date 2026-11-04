import { z } from "zod";
import {
   ActorSchema,
   ClearableTextSchema,
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
   blockedOn: ClearableTextSchema.optional(),
   tags: TagsSchema.optional(),
   parentId: TaskIdSchema.nullable().optional(),
   links: LinksSchema.optional(),
   assignee: z.string().optional(),
   sourceKey: ClearableTextSchema.optional(),
   by: ActorSchema,
});

import { z } from "zod";
import {
   ActorSchema,
   LinksSchema,
   PrioritySchema,
   TagsSchema,
   TaskIdSchema,
} from "../shared/schemas";

export const LogWorkSchema = z.object({
   title: z.string(),
   description: z.string(),
   update: z.string(),
   status: z.enum(["done", "picked"]).default("done"),
   priority: PrioritySchema.default("normal"),
   tags: TagsSchema.default([]),
   parentId: TaskIdSchema.nullable().default(null),
   links: LinksSchema.default([]),
   by: ActorSchema,
});

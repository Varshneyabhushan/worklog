import { z } from "zod";
import { SELF } from "../../entities/task";
import {
   ActorSchema,
   LinksSchema,
   LocalDateSchema,
   PrioritySchema,
   TagsSchema,
   TaskIdSchema,
} from "../shared/schemas";

export const CreateTaskSchema = z.object({
   title: z.string(),
   description: z.string(),
   status: z.enum(["backlog", "picked"]).default("backlog"),
   priority: PrioritySchema.default("normal"),
   due: LocalDateSchema.nullable().default(null),
   blockedOn: z.string().nullable().default(null),
   tags: TagsSchema.default([]),
   parentId: TaskIdSchema.nullable().default(null),
   links: LinksSchema.default([]),
   assignee: z.string().default(SELF),
   /** Omitted: taken from a ticket or PR link. Null: none. */
   sourceKey: z.string().nullable().optional(),
   importedFrom: z.string().nullable().default(null),
   by: ActorSchema,
});

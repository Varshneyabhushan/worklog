import { z } from "zod";
import { EVENT_ACTORS } from "../../entities/task";
import { LinksSchema, PrioritySchema, TagsSchema } from "../shared/schemas";

export const UpsertTaskFromSourceSchema = z.object({
   sourceKey: z.string(),
   title: z.string(),
   description: z.string(),
   links: LinksSchema.default([]),
   tags: TagsSchema.default([]),
   priority: PrioritySchema.default("normal"),
   status: z.enum(["backlog", "picked"]).default("backlog"),
   by: z.enum(EVENT_ACTORS).default("routine"),
});

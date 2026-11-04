import { z } from "zod";
import {
   EVENT_ACTORS,
   LINK_KINDS,
   PRIORITIES,
   TASK_STATUSES,
   normalizeTag,
} from "../../entities/task";
import { isLocalDate } from "../../utils/dates";

export const TaskIdSchema = z.string().trim().min(1);
export const StatusSchema = z.enum(TASK_STATUSES);
export const PrioritySchema = z.enum(PRIORITIES);
export const ActorSchema = z.enum(EVENT_ACTORS).default("self");
export const LocalDateSchema = z
   .string()
   .refine(isLocalDate, { error: "expected a real date as YYYY-MM-DD" });
export const InstantSchema = z.iso.datetime({ offset: true }).transform((value) => new Date(value));
export const TagsSchema = z
   .array(z.string())
   .transform((tags) => [...new Set(tags.map(normalizeTag))]);
// An MCP client sometimes sends the text "null" when it means to clear a field.
export const ClearableTextSchema = z
   .string()
   .refine((value) => value.trim() !== "null", { error: 'to clear it, send null, not "null"' })
   .nullable();
export const LinkSchema = z.object({
   kind: z.enum(LINK_KINDS),
   url: z.string(),
   label: ClearableTextSchema.default(null),
});
export const LinksSchema = z.array(LinkSchema);

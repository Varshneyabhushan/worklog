import { z } from "zod";
import { SEARCH_KINDS } from "../../services/search";

export const SearchSchema = z.object({
   query: z.string().trim().min(1, { error: "query is required" }),
   kinds: z.array(z.enum(SEARCH_KINDS)).default([...SEARCH_KINDS]),
   limit: z.number().int().min(1).max(100).default(20),
});

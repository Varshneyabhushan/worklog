import type { SearchHit, SearchService } from "../../services/search";
import type { UpdateService } from "../../services/update";
import { NotFoundError } from "../../utils/errors";
import { parseInput } from "../shared/parseInput";
import { InvalidSearchInputError } from "./errors";
import { SearchSchema } from "./schema";

export interface SearchResult extends SearchHit {
   /** The task a task or update hit belongs to; null for a day note. */
   taskId: string | null;
}

export default class SearchUseCase {
   constructor(
      private readonly search: SearchService,
      private readonly updates: UpdateService,
   ) {}

   async execute(input: unknown): Promise<SearchResult[]> {
      const { query, kinds, limit } = parseInput(SearchSchema, input, InvalidSearchInputError);
      return this.search.search(query, kinds, limit).flatMap((hit): SearchResult[] => {
         if (hit.kind === "task") return [{ ...hit, taskId: hit.ref }];
         if (hit.kind === "note") return [{ ...hit, taskId: null }];
         try {
            return [{ ...hit, taskId: this.updates.get(Number(hit.ref)).taskId }];
         } catch (err) {
            if (err instanceof NotFoundError) return [];
            throw err;
         }
      });
   }
}

import type { SearchHit, SearchIndex, SearchKind } from "./models";

export { SEARCH_KINDS } from "./models";
export type { SearchHit, SearchKind } from "./models";

export class SearchService {
   constructor(private readonly index: SearchIndex) {}

   search(query: string, kinds: SearchKind[], limit: number): SearchHit[] {
      return this.index.search(query, kinds, limit);
   }
}

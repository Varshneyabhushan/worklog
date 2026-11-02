export const SEARCH_KINDS = ["task", "update", "note"] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export interface SearchHit {
   kind: SearchKind;
   /** Task id, update id or note id, as text. */
   ref: string;
   snippet: string;
}

export interface SearchIndex {
   search(query: string, kinds: SearchKind[], limit: number): SearchHit[];
}

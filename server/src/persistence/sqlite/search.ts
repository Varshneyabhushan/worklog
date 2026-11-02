import type { SearchHit, SearchIndex, SearchKind } from "../../services/search/models";
import { placeholders, type Db } from "./database";

export default class SqliteSearchIndex implements SearchIndex {
   constructor(private readonly db: Db) {}

   search(query: string, kinds: SearchKind[], limit: number): SearchHit[] {
      const match = toMatchExpression(query);
      if (match === null || kinds.length === 0) return [];
      return this.db
         .prepare(
            `SELECT kind, ref, snippet(search, 2, '«', '»', '…', 12) AS snippet
             FROM search WHERE search MATCH ? AND kind IN (${placeholders(kinds)})
             ORDER BY rank LIMIT ?`,
         )
         .all(match, ...kinds, limit) as SearchHit[];
   }
}

// every word must appear, each as a prefix; quoting keeps FTS5 operators in the text literal
function toMatchExpression(query: string): string | null {
   const words = query.match(/[\p{L}\p{N}]+/gu);
   if (!words) return null;
   return words.map((word) => `"${word}"*`).join(" ");
}

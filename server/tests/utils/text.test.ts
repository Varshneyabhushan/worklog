import { describe, expect, it } from "vitest";
import { isHttpUrl, isSlug } from "../../src/utils/text";

describe("isSlug", () => {
   it.each(["pfg", "skill-evals", "fde-447", "pr-bot"])("accepts %s", (value) => {
      expect(isSlug(value)).toBe(true);
   });

   it.each(["", "Skill-Evals", "skill_evals", "-pfg", "pfg-", "a--b", "a b"])(
      "rejects %s",
      (value) => {
         expect(isSlug(value)).toBe(false);
      },
   );
});

describe("isHttpUrl", () => {
   it.each(["https://linear.app/x/issue/ABC-1", "http://127.0.0.1:8765/mcp"])(
      "accepts %s",
      (url) => {
         expect(isHttpUrl(url)).toBe(true);
      },
   );

   it.each(["ftp://host/file", "javascript:alert(1)", "not a url", ""])("rejects %s", (url) => {
      expect(isHttpUrl(url)).toBe(false);
   });
});

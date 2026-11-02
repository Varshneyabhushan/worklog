import { describe, expect, it } from "vitest";
import { UpdateInvariantError } from "../../src/entities/update";
import { assertValidUpdate } from "../../src/entities/update/validation";
import { makeUpdate } from "../fakes/updates";

describe("update invariants", () => {
   it("accepts a valid update", () => {
      expect(() => assertValidUpdate(makeUpdate())).not.toThrow();
      expect(() => assertValidUpdate(makeUpdate({ by: "routine" }))).not.toThrow();
   });

   it.each([
      ["empty body", makeUpdate({ body: " " }), "body"],
      ["long body", makeUpdate({ body: "x".repeat(20_001) }), "body"],
      ["unknown author", makeUpdate({ by: "codex" as "self" }), "by"],
   ])("rejects %s", (_name, update, field) => {
      try {
         assertValidUpdate(update);
         expect.fail("expected an invariant error");
      } catch (err) {
         expect(err).toBeInstanceOf(UpdateInvariantError);
         expect((err as UpdateInvariantError).field).toBe(field);
      }
   });
});

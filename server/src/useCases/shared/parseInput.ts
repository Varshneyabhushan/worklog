import { z } from "zod";

/** Parses `input` with `schema`, or throws `InvalidInputError` with every issue in one message. */
export function parseInput<T extends z.ZodType>(
   schema: T,
   input: unknown,
   InvalidInputError: new (message: string) => Error,
): z.infer<T> {
   const parsed = schema.safeParse(input);
   if (parsed.success) return parsed.data;

   const message = parsed.error.issues
      .map((issue) =>
         issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message,
      )
      .join("; ");
   throw new InvalidInputError(message);
}

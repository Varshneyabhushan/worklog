import { z } from "zod";
import { ActorSchema } from "../shared/schemas";

export const DeleteUpdateSchema = z.object({ id: z.number().int().positive(), by: ActorSchema });

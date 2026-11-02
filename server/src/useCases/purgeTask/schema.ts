import { z } from "zod";
import { TaskIdSchema } from "../shared/schemas";

export const PurgeTaskSchema = z.object({ id: TaskIdSchema });

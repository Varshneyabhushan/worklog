import { z } from "zod";
import { TaskIdSchema } from "../shared/schemas";

export const GetTaskSchema = z.object({ id: TaskIdSchema });

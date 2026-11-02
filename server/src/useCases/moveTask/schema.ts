import { z } from "zod";
import { ActorSchema, StatusSchema, TaskIdSchema } from "../shared/schemas";

export const MoveTaskSchema = z.object({ id: TaskIdSchema, status: StatusSchema, by: ActorSchema });

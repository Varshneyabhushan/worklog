import { z } from "zod";
import { LocalDateSchema } from "../shared/schemas";

export const GetDaySchema = z.object({ date: LocalDateSchema });

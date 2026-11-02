import type { Task } from "../../entities/task";
import type { Update } from "../../entities/update";
import type { TaskService } from "../../services/task";
import type { UpdateService } from "../../services/update";
import { parseInput } from "../shared/parseInput";
import { InvalidGetTaskInputError } from "./errors";
import { GetTaskSchema } from "./schema";

export default class GetTaskUseCase {
   constructor(
      private readonly tasks: TaskService,
      private readonly updates: UpdateService,
   ) {}

   async execute(input: unknown): Promise<{ task: Task; updates: Update[]; subTasks: Task[] }> {
      const { id } = parseInput(GetTaskSchema, input, InvalidGetTaskInputError);
      return {
         task: this.tasks.get(id),
         updates: this.updates.listByTask(id),
         subTasks: this.tasks.list({ parentId: id }),
      };
   }
}

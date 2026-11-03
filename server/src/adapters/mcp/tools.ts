import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "pino";
import type { z } from "zod";
import { AddDayNoteSchema } from "../../useCases/addDayNote/schema";
import { AddMeetingSchema } from "../../useCases/addMeeting/schema";
import { AddUpdateSchema } from "../../useCases/addUpdate/schema";
import { CreateTaskSchema } from "../../useCases/createTask/schema";
import { DeleteDayNoteSchema } from "../../useCases/deleteDayNote/schema";
import { DeleteMeetingSchema } from "../../useCases/deleteMeeting/schema";
import { DeleteUpdateSchema } from "../../useCases/deleteUpdate/schema";
import { EditMeetingSchema } from "../../useCases/editMeeting/schema";
import { EditTaskSchema } from "../../useCases/editTask/schema";
import { EditUpdateSchema } from "../../useCases/editUpdate/schema";
import { GetDaySchema } from "../../useCases/getDay/schema";
import { GetTaskSchema } from "../../useCases/getTask/schema";
import { ListDaysSchema } from "../../useCases/listDays/schema";
import { ListMeetingsSchema } from "../../useCases/listMeetings/schema";
import { ListTasksSchema } from "../../useCases/listTasks/schema";
import { LogWorkSchema } from "../../useCases/logWork/schema";
import { MoveTaskSchema } from "../../useCases/moveTask/schema";
import { MoveUpdateSchema } from "../../useCases/moveUpdate/schema";
import { PurgeTaskSchema } from "../../useCases/purgeTask/schema";
import { ReopenTaskSchema } from "../../useCases/reopenTask/schema";
import { SearchSchema } from "../../useCases/search/schema";
import { SignOffDaySchema } from "../../useCases/signOffDay/schema";
import { UndoTaskChangeSchema } from "../../useCases/undoTaskChange/schema";
import { UpsertTaskFromSourceSchema } from "../../useCases/upsertTaskFromSource/schema";
import {
   ConflictError,
   InvalidInputError,
   InvariantError,
   NotFoundError,
} from "../../utils/errors";
import type { McpUseCases } from "./useCases";

interface Executable {
   execute(input?: unknown): Promise<unknown>;
}

interface ToolSpec {
   name: string;
   description: string;
   schema: z.ZodObject | null;
   useCase: Executable;
}

// decideReview is absent here: it is registered in app.ts, callable only from the worklog view.
function specs(useCases: McpUseCases): ToolSpec[] {
   return [
      {
         name: "get_today",
         description:
            "Today's schedule, review queue, picked and waiting tasks, progress, notes and backlog size, plus earlier days not signed off.",
         schema: null,
         useCase: useCases.getToday,
      },
      {
         name: "list_tasks",
         description: "Tasks in plan order, filtered by statuses, tag, assignee or parent.",
         schema: ListTasksSchema,
         useCase: useCases.listTasks,
      },
      {
         name: "get_task",
         description: "One task with its history, its updates and its sub-tasks.",
         schema: GetTaskSchema,
         useCase: useCases.getTask,
      },
      {
         name: "create_task",
         description:
            "Create a task in backlog or picked. A ticket or PR link sets its source key unless one is given.",
         schema: CreateTaskSchema,
         useCase: useCases.createTask,
      },
      {
         name: "log_work",
         description:
            "Record unplanned work: creates the task (done or picked) with its first update.",
         schema: LogWorkSchema,
         useCase: useCases.logWork,
      },
      {
         name: "edit_task",
         description:
            "Change a task's fields; only the fields given change. blockedOn sets or clears the wait.",
         schema: EditTaskSchema,
         useCase: useCases.editTask,
      },
      {
         name: "move_task",
         description:
            "Change a task's status. Refused for a task in review, which only the user decides.",
         schema: MoveTaskSchema,
         useCase: useCases.moveTask,
      },
      {
         name: "reopen_task",
         description:
            "Reopen a done or dropped task into picked or backlog, with an update giving the reason.",
         schema: ReopenTaskSchema,
         useCase: useCases.reopenTask,
      },
      {
         name: "upsert_task_from_source",
         description:
            "For routines: refresh the title and links of the task with this source key, or create it. Reports whether it is closed.",
         schema: UpsertTaskFromSourceSchema,
         useCase: useCases.upsertTaskFromSource,
      },
      {
         name: "undo_task_change",
         description: "Undo a status or field change: the given event, or the latest one.",
         schema: UndoTaskChangeSchema,
         useCase: useCases.undoTaskChange,
      },
      {
         name: "purge_task",
         description: "Delete a task with its history and updates, permanently.",
         schema: PurgeTaskSchema,
         useCase: useCases.purgeTask,
      },
      {
         name: "add_update",
         description:
            "Add a progress update to a task. inSummary: false makes it a remark, kept on the task but out of the day's Summary.",
         schema: AddUpdateSchema,
         useCase: useCases.addUpdate,
      },
      {
         name: "edit_update",
         description:
            "Replace an update's text, or move it in or out of the day's Summary with inSummary; the task's history keeps the old values.",
         schema: EditUpdateSchema,
         useCase: useCases.editUpdate,
      },
      {
         name: "move_update",
         description: "Move an update to another task.",
         schema: MoveUpdateSchema,
         useCase: useCases.moveUpdate,
      },
      {
         name: "delete_update",
         description: "Delete an update.",
         schema: DeleteUpdateSchema,
         useCase: useCases.deleteUpdate,
      },
      {
         name: "add_day_note",
         description:
            "Add a note to a day (today when no date is given); earlier days are allowed.",
         schema: AddDayNoteSchema,
         useCase: useCases.addDayNote,
      },
      {
         name: "delete_day_note",
         description: "Delete a day note, permanently.",
         schema: DeleteDayNoteSchema,
         useCase: useCases.deleteDayNote,
      },
      {
         name: "get_day",
         description: "A day's notes, frozen Summary, tasks, done task ids and updates.",
         schema: GetDaySchema,
         useCase: useCases.getDay,
      },
      {
         name: "list_days",
         description: "Days with notes or a sign-off, newest first.",
         schema: ListDaysSchema,
         useCase: useCases.listDays,
      },
      {
         name: "sign_off_day",
         description:
            "Freeze a day's Summary from its updates and write its markdown report (today when no date is given).",
         schema: SignOffDaySchema,
         useCase: useCases.signOffDay,
      },
      {
         name: "list_meetings",
         description: "A day's meetings (today when no date is given).",
         schema: ListMeetingsSchema,
         useCase: useCases.listMeetings,
      },
      {
         name: "add_meeting",
         description:
            "Add a meeting with exact start and optional end times (ISO 8601 with offset).",
         schema: AddMeetingSchema,
         useCase: useCases.addMeeting,
      },
      {
         name: "edit_meeting",
         description: "Change a meeting's fields, including cancelled.",
         schema: EditMeetingSchema,
         useCase: useCases.editMeeting,
      },
      {
         name: "delete_meeting",
         description: "Delete a meeting.",
         schema: DeleteMeetingSchema,
         useCase: useCases.deleteMeeting,
      },
      {
         name: "search",
         description: "Full-text search over task titles and descriptions, updates and day notes.",
         schema: SearchSchema,
         useCase: useCases.search,
      },
      {
         name: "export_backup",
         description: "Write the whole database as SQL text to the backup file.",
         schema: null,
         useCase: useCases.exportBackup,
      },
   ];
}

export function registerTools(server: McpServer, useCases: McpUseCases, logger: Logger): void {
   for (const spec of specs(useCases)) {
      const run = (args: unknown) => runUseCase(spec.useCase, args, spec.name, logger);
      if (spec.schema === null) {
         server.registerTool(spec.name, { description: spec.description }, () => run({}));
      } else {
         server.registerTool(
            spec.name,
            { description: spec.description, inputSchema: spec.schema },
            (args) => run(args),
         );
      }
   }
}

export async function runUseCase(
   useCase: Executable,
   args: unknown,
   tool: string,
   logger: Logger,
): Promise<CallToolResult> {
   try {
      // the SDK passes arguments already parsed by our schema; back to JSON, so the use case parses what was sent
      const result = await useCase.execute(JSON.parse(JSON.stringify(args ?? {})));
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
   } catch (err) {
      return toolError(err, tool, logger);
   }
}

function toolError(err: unknown, tool: string, logger: Logger): CallToolResult {
   const known =
      err instanceof InvalidInputError ||
      err instanceof InvariantError ||
      err instanceof NotFoundError ||
      err instanceof ConflictError;
   if (!known) logger.error({ err, tool }, "tool failed");
   const text = known
      ? `${(err as Error).name}: ${(err as Error).message}`
      : "Something went wrong.";
   return { isError: true, content: [{ type: "text", text }] };
}

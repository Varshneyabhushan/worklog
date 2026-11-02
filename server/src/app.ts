import type { Logger } from "pino";
import ChangeFeed from "./integrations/ChangeFeed";
import type { Clock } from "./integrations/Clock";
import type { FileWriter } from "./integrations/FileSystem";
import SqliteBackupSource from "./persistence/sqlite/backup";
import type { Db } from "./persistence/sqlite/database";
import SqliteDayRepository from "./persistence/sqlite/days";
import SqliteMeetingRepository from "./persistence/sqlite/meetings";
import SqliteSearchIndex from "./persistence/sqlite/search";
import SqliteTaskRepository from "./persistence/sqlite/tasks";
import SqliteUpdateRepository from "./persistence/sqlite/updates";
import { BackupService } from "./services/backup";
import { DayService } from "./services/day";
import { MeetingService } from "./services/meeting";
import { SearchService } from "./services/search";
import { TaskService } from "./services/task";
import { UpdateService } from "./services/update";
import AddDayNoteUseCase from "./useCases/addDayNote";
import AddMeetingUseCase from "./useCases/addMeeting";
import AddUpdateUseCase from "./useCases/addUpdate";
import CreateTaskUseCase from "./useCases/createTask";
import DecideReviewUseCase from "./useCases/decideReview";
import DeleteDayNoteUseCase from "./useCases/deleteDayNote";
import DeleteMeetingUseCase from "./useCases/deleteMeeting";
import DeleteUpdateUseCase from "./useCases/deleteUpdate";
import EditMeetingUseCase from "./useCases/editMeeting";
import EditTaskUseCase from "./useCases/editTask";
import EditUpdateUseCase from "./useCases/editUpdate";
import ExportBackupUseCase from "./useCases/exportBackup";
import GetDayUseCase from "./useCases/getDay";
import GetTaskUseCase from "./useCases/getTask";
import GetTodayUseCase from "./useCases/getToday";
import ListDaysUseCase from "./useCases/listDays";
import ListMeetingsUseCase from "./useCases/listMeetings";
import ListTasksUseCase from "./useCases/listTasks";
import LogWorkUseCase from "./useCases/logWork";
import MoveTaskUseCase from "./useCases/moveTask";
import MoveUpdateUseCase from "./useCases/moveUpdate";
import PurgeTaskUseCase from "./useCases/purgeTask";
import ReopenTaskUseCase from "./useCases/reopenTask";
import SearchUseCase from "./useCases/search";
import type { UseCaseContext } from "./useCases/shared/context";
import SignOffDayUseCase from "./useCases/signOffDay";
import UndoTaskChangeUseCase from "./useCases/undoTaskChange";
import UpsertTaskFromSourceUseCase from "./useCases/upsertTaskFromSource";
import WatchChangesUseCase from "./useCases/watchChanges";
import WriteTodaySnapshotUseCase from "./useCases/writeTodaySnapshot";

export interface AppSettings {
   db: Db;
   clock: Clock;
   files: FileWriter;
   logger: Logger;
   timeZone: string;
   reportRoot: string;
   snapshotPath: string;
   backupPath: string;
}

/** Builds the use-case graph once; the server and the tests share this wiring. */
export function createUseCases(settings: AppSettings) {
   const { db, clock, files, logger, timeZone } = settings;

   const tasks = new TaskService(new SqliteTaskRepository(db));
   const updates = new UpdateService(new SqliteUpdateRepository(db));
   const days = new DayService(new SqliteDayRepository(db));
   const meetings = new MeetingService(new SqliteMeetingRepository(db));
   const search = new SearchService(new SqliteSearchIndex(db));
   const backup = new BackupService(new SqliteBackupSource(db));

   const changes = new ChangeFeed((err) => logger.error({ err }, "change listener failed"));
   const ctx: UseCaseContext = { clock, timeZone, changes };
   const activity = { tasks, updates, days };
   const today = { ...activity, meetings };

   return {
      createTask: new CreateTaskUseCase(tasks, ctx),
      logWork: new LogWorkUseCase(tasks, updates, ctx),
      getTask: new GetTaskUseCase(tasks, updates),
      listTasks: new ListTasksUseCase(tasks, ctx),
      editTask: new EditTaskUseCase(tasks, ctx),
      moveTask: new MoveTaskUseCase(tasks, ctx),
      decideReview: new DecideReviewUseCase(tasks, updates, ctx),
      reopenTask: new ReopenTaskUseCase(tasks, updates, ctx),
      upsertTaskFromSource: new UpsertTaskFromSourceUseCase(tasks, ctx),
      undoTaskChange: new UndoTaskChangeUseCase(tasks, ctx),
      purgeTask: new PurgeTaskUseCase(tasks, ctx),
      addUpdate: new AddUpdateUseCase(tasks, updates, ctx),
      editUpdate: new EditUpdateUseCase(tasks, updates, ctx),
      moveUpdate: new MoveUpdateUseCase(tasks, updates, ctx),
      deleteUpdate: new DeleteUpdateUseCase(tasks, updates, ctx),
      addDayNote: new AddDayNoteUseCase(days, ctx),
      deleteDayNote: new DeleteDayNoteUseCase(days, ctx),
      getDay: new GetDayUseCase(activity, ctx),
      listDays: new ListDaysUseCase(days),
      signOffDay: new SignOffDayUseCase(activity, files, settings.reportRoot, ctx),
      addMeeting: new AddMeetingUseCase(meetings, ctx),
      editMeeting: new EditMeetingUseCase(meetings, ctx),
      deleteMeeting: new DeleteMeetingUseCase(meetings, ctx),
      listMeetings: new ListMeetingsUseCase(meetings, ctx),
      getToday: new GetTodayUseCase(today, ctx),
      search: new SearchUseCase(search, updates),
      exportBackup: new ExportBackupUseCase(backup, files, settings.backupPath),
      watchChanges: new WatchChangesUseCase(ctx),
      writeTodaySnapshot: new WriteTodaySnapshotUseCase(today, files, settings.snapshotPath, ctx),
   };
}

export type UseCases = ReturnType<typeof createUseCases>;

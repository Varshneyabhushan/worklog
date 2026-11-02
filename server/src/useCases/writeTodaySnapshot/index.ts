import type { FileWriter } from "../../integrations/FileSystem";
import type { UseCaseContext } from "../shared/context";
import { buildToday, type TodayServices } from "../shared/today";

/** Writes the /today view to the file the Claude Code pane reads. */
export default class WriteTodaySnapshotUseCase {
   constructor(
      private readonly services: TodayServices,
      private readonly files: FileWriter,
      private readonly snapshotPath: string,
      private readonly ctx: UseCaseContext,
   ) {}

   async execute(): Promise<{ path: string }> {
      const today = buildToday(this.services, this.ctx.clock.now(), this.ctx.timeZone);
      this.files.writeAtomic(this.snapshotPath, JSON.stringify(today, null, 2));
      return { path: this.snapshotPath };
   }
}

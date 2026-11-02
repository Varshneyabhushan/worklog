import type { ChangeListener } from "../../integrations/ChangeFeed";
import type { UseCaseContext } from "../shared/context";

export default class WatchChangesUseCase {
   constructor(private readonly ctx: UseCaseContext) {}

   execute(listener: ChangeListener): () => void {
      return this.ctx.changes.subscribe(listener);
   }
}

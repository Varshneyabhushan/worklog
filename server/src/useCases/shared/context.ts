import type ChangeFeed from "../../integrations/ChangeFeed";
import type { Clock } from "../../integrations/Clock";

export interface UseCaseContext {
   clock: Clock;
   timeZone: string;
   changes: ChangeFeed;
}

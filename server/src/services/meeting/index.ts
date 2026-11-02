import { Meeting } from "../../entities/meeting";
import { assertValidMeeting } from "../../entities/meeting/validation";
import { MeetingNotFoundError } from "./errors";
import type { MeetingRepository, NewMeeting } from "./models";

export * from "./errors";
export type { NewMeeting } from "./models";

export class MeetingService {
   constructor(private readonly repo: MeetingRepository) {}

   add(meeting: NewMeeting): Meeting {
      assertValidMeeting({ id: 0, ...meeting });
      return this.repo.add(meeting);
   }

   get(id: number): Meeting {
      const meeting = this.repo.getById(id);
      if (!meeting) throw new MeetingNotFoundError(id);
      return meeting;
   }

   edit(id: number, changes: Partial<NewMeeting>): Meeting {
      const next = new Meeting({ ...this.get(id), ...changes });
      assertValidMeeting(next);
      return this.repo.save(next);
   }

   startingBetween(from: Date, to: Date): Meeting[] {
      return this.repo.startingBetween(from, to);
   }

   delete(id: number): void {
      if (!this.repo.delete(id)) throw new MeetingNotFoundError(id);
   }
}

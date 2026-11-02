import type { Meeting, MeetingProps } from "../../entities/meeting";

export type NewMeeting = Omit<MeetingProps, "id">;

export interface MeetingRepository {
   add(meeting: NewMeeting): Meeting;
   getById(id: number): Meeting | null;
   save(meeting: Meeting): Meeting;
   startingBetween(from: Date, to: Date): Meeting[];
   delete(id: number): boolean;
}

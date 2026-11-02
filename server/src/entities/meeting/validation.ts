import { isHttpUrl } from "../../utils/text";
import { MEETING_SOURCES, type MeetingProps } from ".";
import { MeetingInvariantError } from "./errors";

export function assertValidMeeting(meeting: MeetingProps): void {
   if (meeting.endsAt !== null && meeting.endsAt < meeting.startsAt) {
      throw new MeetingInvariantError(
         "a meeting cannot end before it starts",
         "endsAt",
         meeting.endsAt,
      );
   }
   if (meeting.title.trim() === "") {
      throw new MeetingInvariantError("a meeting needs a title", "title", meeting.title);
   }
   if (meeting.joinUrl !== null && !isHttpUrl(meeting.joinUrl)) {
      throw new MeetingInvariantError(
         `not an http(s) url: ${meeting.joinUrl}`,
         "joinUrl",
         meeting.joinUrl,
      );
   }
   if (!MEETING_SOURCES.includes(meeting.source)) {
      throw new MeetingInvariantError(
         `unknown source "${meeting.source}"`,
         "source",
         meeting.source,
      );
   }
}

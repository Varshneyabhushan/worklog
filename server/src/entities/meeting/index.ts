export * from "./errors";

export const MEETING_SOURCES = ["calendar", "manual"] as const;
export type MeetingSource = (typeof MEETING_SOURCES)[number];

export interface MeetingProps {
   id: number;
   startsAt: Date;
   /** Null for a manual entry with no duration; it is over once it starts. */
   endsAt: Date | null;
   title: string;
   joinUrl: string | null;
   source: MeetingSource;
   cancelled: boolean;
}

export interface Meeting extends Readonly<MeetingProps> {}
export class Meeting {
   constructor(props: MeetingProps) {
      Object.assign(this, props);
   }

   hasStarted(now: Date): boolean {
      return now >= this.startsAt;
   }

   isOver(now: Date): boolean {
      return now >= (this.endsAt ?? this.startsAt);
   }
}

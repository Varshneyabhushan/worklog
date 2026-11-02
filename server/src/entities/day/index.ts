import type { LocalDate } from "../../utils/dates";

export * from "./errors";

export interface DayNoteProps {
   /** Null until the repository saves the note. */
   id: number | null;
   body: string;
   createdAt: Date;
}

export interface DayNote extends Readonly<DayNoteProps> {}
export class DayNote {
   constructor(props: DayNoteProps) {
      Object.assign(this, props);
   }
}

export interface DayProps {
   date: LocalDate;
   summary: string | null;
   signedOffAt: Date | null;
   notes: DayNote[];
}

export interface Day extends Readonly<DayProps> {}
export class Day {
   constructor(props: DayProps) {
      Object.assign(this, props);
   }

   static open(date: LocalDate): Day {
      return new Day({ date, summary: null, signedOffAt: null, notes: [] });
   }

   get isSignedOff(): boolean {
      return this.signedOffAt !== null;
   }

   get unsavedNotes(): DayNote[] {
      return this.notes.filter((note) => note.id === null);
   }

   /** A note may go on an earlier day; on a signed-off day its Summary needs signing off again. */
   addNote(body: string, at: Date): Day {
      const note = new DayNote({ id: null, body, createdAt: at });
      return new Day({ ...this, notes: [...this.notes, note] });
   }

   /** Re-signing a signed-off day replaces its frozen summary. */
   signOff(summary: string, at: Date): Day {
      return new Day({ ...this, summary, signedOffAt: at });
   }

   toJSON() {
      return { ...this, isSignedOff: this.isSignedOff };
   }
}

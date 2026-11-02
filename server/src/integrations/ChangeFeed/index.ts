export type ChangeKind = "task" | "update" | "day" | "meeting";

export interface Change {
   kind: ChangeKind;
   id: string | null;
}

export type ChangeListener = (change: Change) => void;

export default class ChangeFeed {
   private readonly listeners = new Set<ChangeListener>();

   constructor(private readonly onListenerError: (err: unknown) => void) {}

   publish(change: Change): void {
      for (const listener of this.listeners) {
         try {
            listener(change);
         } catch (err) {
            this.onListenerError(err);
         }
      }
   }

   subscribe(listener: ChangeListener): () => void {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
   }
}

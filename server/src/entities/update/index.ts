export * from "./errors";

export const UPDATE_AUTHORS = ["self", "routine"] as const;
export type UpdateAuthor = (typeof UPDATE_AUTHORS)[number];

export interface UpdateProps {
   id: number;
   taskId: string;
   body: string;
   by: UpdateAuthor;
   at: Date;
}

export interface Update extends Readonly<UpdateProps> {}
export class Update {
   constructor(props: UpdateProps) {
      Object.assign(this, props);
   }
}

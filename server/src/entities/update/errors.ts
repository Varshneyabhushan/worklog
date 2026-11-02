export class UpdateInvariantError extends Error {
   constructor(
      message: string,
      readonly field: string,
      readonly value?: unknown,
   ) {
      super(message);
      this.name = new.target.name;
   }
}

// Error families every layer extends; adapters map a family to one status code.

export class InvalidInputError extends Error {
   constructor(message: string) {
      super(message);
      this.name = new.target.name;
   }
}

export class InvariantError extends Error {
   constructor(
      message: string,
      readonly field: string,
      readonly value?: unknown,
   ) {
      super(message);
      this.name = new.target.name;
   }
}

export class NotFoundError extends Error {
   constructor(message: string) {
      super(message);
      this.name = new.target.name;
   }
}

export class ConflictError extends Error {
   constructor(message: string) {
      super(message);
      this.name = new.target.name;
   }
}

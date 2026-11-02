export interface Clock {
   now(): Date;
}

export default class SystemClock implements Clock {
   now(): Date {
      return new Date();
   }
}

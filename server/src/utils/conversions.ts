export function toNumber(value: string | undefined, fallback: number): number {
   const parsed = Number(value);
   return value === undefined || value.trim() === "" || Number.isNaN(parsed) ? fallback : parsed;
}

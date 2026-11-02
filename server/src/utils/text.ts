const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isSlug(value: string): boolean {
   return SLUG.test(value);
}

export function isHttpUrl(value: string): boolean {
   try {
      const { protocol } = new URL(value);
      return protocol === "https:" || protocol === "http:";
   } catch {
      return false;
   }
}

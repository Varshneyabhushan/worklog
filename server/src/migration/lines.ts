import { normalizeTag, type LinkKind, type TaskLink } from "../entities/task";
import { isHttpUrl, isSlug } from "../utils/text";

const MARKDOWN_LINK = /\[([^\]]*)\]\((\S+?)\)/g;
const AUTOLINK = /<(https?:\/\/[^>\s]+)>/g;
const CLOCK = /[\u{1F550}-\u{1F567}]/gu;
const MAX_TITLE = 200;
// the old notes' trailing deep links ("- [slack](…)"): kept as links, not as title words
const DEEP_LINK = /\s*[-–—]?\s*\[(slack|meeting|comment|artifact|thread|doc|link)\]\([^)]*\)/gi;

export function linksOf(text: string): TaskLink[] {
   const found = new Map<string, TaskLink>();
   for (const [, label, url] of text.matchAll(MARKDOWN_LINK)) {
      if (isHttpUrl(url) && !found.has(url)) {
         found.set(url, { kind: kindOf(url), url, label: label.trim() || null });
      }
   }
   for (const [, url] of text.matchAll(AUTOLINK)) {
      if (!found.has(url)) found.set(url, { kind: kindOf(url), url, label: null });
   }
   return [...found.values()];
}

function kindOf(url: string): LinkKind {
   if (/linear\.app\/[^/]+\/issue\//.test(url)) return "ticket";
   if (/github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test(url)) return "pr";
   if (/slack\.com\//.test(url)) return "slack";
   if (/claude\.ai\/(code\/)?artifact/.test(url)) return "artifact";
   if (/zoom\.us\/|teams\.microsoft\.com|meet\.google\.com/.test(url)) return "meeting";
   return "other";
}

export function plainText(text: string): string {
   return text
      .replace(MARKDOWN_LINK, "$1")
      .replace(AUTOLINK, "")
      .replace(/\*\*|__|`/g, "")
      .replace(/\s+/g, " ")
      .trim();
}

export interface LineMeaning {
   title: string;
   /** The ⌛ reason, unless it only says the item was postponed. */
   blockedOn: string | null;
   postponed: boolean;
   dropped: boolean;
}

export function meaningOf(text: string): LineMeaning {
   const dropped = text.includes("❌");
   const [before, wait] = text.split("⌛", 2);
   const reason = wait === undefined ? null : plainText(wait).replace(/^[\s—–-]+/, "");
   const postponed = reason !== null && /^postponed\b/i.test(reason);

   let title = plainText(before.replace(DEEP_LINK, "").replace(/❌/g, "").replace(CLOCK, ""))
      .replace(/(\s*[-—–]\s*)+$/, "")
      .trim();
   if (title === "") title = plainText(text).slice(0, MAX_TITLE) || "Untitled imported item";
   if (title.length > MAX_TITLE) title = `${title.slice(0, MAX_TITLE - 1).trimEnd()}…`;

   return {
      title,
      blockedOn: postponed || reason === null ? null : reason || "waiting",
      postponed,
      dropped,
   };
}

/** Lowercase words only, so a carried-over line matches itself despite punctuation drift. */
export function identityOf(title: string): string {
   return title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
}

export function tagOf(area: string | null): string | null {
   if (area === null) return null;
   const tag = normalizeTag(plainText(area))
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "");
   return isSlug(tag) ? tag : null;
}

const AMPM = /\b(?:at\s+)?(\d{1,2})(?::([0-5]\d))?\s*([ap])\.?m\.?(?![a-z])/i;
const AT_24H = /\bat\s+([01]?\d|2[0-3]):([0-5]\d)\b/i;
const CLOCK_ONE = /[\u{1F550}-\u{1F567}]/u;

/** Minutes after midnight for a meeting line, read the way the old /today pane read it. */
export function meetingMinutes(text: string): number | null {
   const ampm = AMPM.exec(text);
   if (ampm) {
      const hour = (Number(ampm[1]) % 12) + (ampm[3].toLowerCase() === "p" ? 12 : 0);
      return hour * 60 + Number(ampm[2] ?? 0);
   }
   const at = AT_24H.exec(text);
   if (at) return Number(at[1]) * 60 + Number(at[2]);
   const emoji = CLOCK_ONE.exec(text)?.[0];
   if (!emoji) return null;
   const n = (emoji.codePointAt(0) ?? 0) - 0x1f550;
   const hour = (n % 12) + 1;
   // the emoji carries no am/pm, so 1–7 o'clock is a working-day afternoon
   return (hour < 8 ? hour + 12 : hour) * 60 + (n < 12 ? 0 : 30);
}

export function isMeetingLine(text: string): boolean {
   return /\[meeting\]\(/i.test(text) || CLOCK_ONE.test(text);
}

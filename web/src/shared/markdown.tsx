import { Marked } from "marked";

const SAFE_URL = /^(https?:|mailto:|#|\/)/i;

function escapeHtml(text: string): string {
   return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const marked = new Marked({
   gfm: true,
   renderer: {
      html({ text }) {
         return escapeHtml(text);
      },
      link({ href, title, tokens }) {
         const label = this.parser.parseInline(tokens);
         if (!SAFE_URL.test(href)) return label;
         const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
         return `<a href="${escapeHtml(href)}"${titleAttr} target="_blank" rel="noreferrer">${label}</a>`;
      },
   },
});

export function Markdown({ text, className }: { text: string; className?: string }) {
   const html = marked.parse(text, { async: false });
   return (
      <div
         className={["markdown", className].filter(Boolean).join(" ")}
         dangerouslySetInnerHTML={{ __html: html }}
      />
   );
}

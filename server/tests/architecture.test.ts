import { describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Enforces the layer rules of use-case-architecture. Only relative (internal)
 * imports are checked; npm packages are exempt.
 *
 * A tier is the first folder under src/ - except adapters, where each
 * transport is its own tier (adapters/http, adapters/agents, ...). Files
 * directly in src/ are the composition root and may import anything.
 *
 * Adding a top-level folder? Add it here with its rules - the failing test is
 * the prompt to decide them deliberately.
 */
const allowedImports: Record<string, string[]> = {
   entities: ["entities", "utils"],
   utils: ["utils"],
   config: ["config", "utils"],
   services: ["services", "entities", "utils"],
   persistence: ["persistence", "services", "entities", "utils"],
   integrations: ["integrations", "entities", "utils"],
   // one-off parsing of the old markdown day files; pure, and written to storage only by the root
   migration: ["migration", "entities", "utils"],
   useCases: ["useCases", "services", "integrations", "entities", "utils"],
   "adapters/agents": ["adapters/agents", "useCases", "entities", "utils"],
   "adapters/http": ["adapters/http", "adapters/agents", "useCases", "entities", "utils"],
   "adapters/mcp": ["adapters/mcp", "useCases", "entities", "utils"],
   "adapters/socket": ["adapters/socket", "adapters/agents", "useCases", "entities", "utils"],
   "adapters/workers": ["adapters/workers", "useCases", "entities", "utils"],
};

/** Finer rules within a tier: units are the second path segment (services/order, useCases/placeOrder). */
function finerRuleViolation(from: Location, to: Location): string | null {
   // services and integrations: one unit per entity/system; never reach a sibling
   if ((from.tier === "services" || from.tier === "integrations") && to.tier === from.tier) {
      if (to.unit !== from.unit)
         return `${from.tier}/${from.unit} must not import ${to.tier}/${to.unit} - orchestration belongs in a use case`;
   }

   // use cases are flat peers; pure helpers are shared through useCases/shared
   if (from.tier === "useCases" && to.tier === "useCases") {
      if (to.unit !== from.unit && to.unit !== "shared")
         return `useCases/${from.unit} must not import useCases/${to.unit} - use cases don't call each other; extract a helper into useCases/shared`;
   }

   // persistence implements ports; it may see a service's models.ts and nothing else
   if (from.tier === "persistence" && to.tier === "services" && to.basename !== "models") {
      return `persistence may import only port types (services/*/models), not ${to.relative}`;
   }

   return null;
}

const srcDir = path.resolve(__dirname, "../src");

interface Location {
   tier: string;
   unit?: string;
   basename: string;
   relative: string;
}

function listSourceFiles(dir: string): string[] {
   return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return listSourceFiles(fullPath);
      return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts") ? [fullPath] : [];
   });
}

/** Resolves "../services/order" to the real file (order.ts or order/index.ts). */
function resolveModule(fromFile: string, specifier: string): string {
   const base = path.resolve(path.dirname(fromFile), specifier);
   for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
   }
   return base;
}

function locate(file: string): Location {
   const relative = path.relative(srcDir, file);
   const segments = relative.split(path.sep);
   const basename = path.basename(file).replace(/\.[^.]+$/, "");

   if (relative.startsWith("..")) return { tier: "outside src", basename, relative };
   if (segments.length === 1) return { tier: "root", basename, relative };
   if (segments[0] === "adapters") {
      return { tier: `adapters/${segments[1]}`, unit: segments[2], basename, relative };
   }
   return {
      tier: segments[0],
      unit: segments.length > 2 ? segments[1] : undefined,
      basename,
      relative,
   };
}

function internalImportsOf(file: string): string[] {
   const source = fs.readFileSync(file, "utf-8");
   const specifiers = [
      ...source.matchAll(/(?:from|import)\s+["']([^"']+)["']/g),
      ...source.matchAll(/(?:require|import)\(\s*["']([^"']+)["']\s*\)/g),
   ].map((match) => match[1]);
   return specifiers.filter((specifier) => specifier.startsWith("."));
}

describe("architecture: layer import rules", () => {
   const files = listSourceFiles(srcDir);

   it("finds the source tree", () => {
      expect(files.length).toBeGreaterThan(0);
   });

   for (const file of files) {
      const from = locate(file);
      if (from.tier === "root") continue; // the composition root may import anything

      it(`${from.relative}`, () => {
         const allowed = allowedImports[from.tier];
         expect(
            allowed,
            `unknown tier "${from.tier}" - add it to allowedImports with its rules`,
         ).toBeDefined();

         for (const specifier of internalImportsOf(file)) {
            const to = locate(resolveModule(file, specifier));
            expect(
               allowed,
               `${from.relative} imports "${specifier}" (tier "${to.tier}"), allowed: [${allowed.join(", ")}]`,
            ).toContain(to.tier);

            const violation = finerRuleViolation(from, to);
            expect(violation, `${from.relative} imports "${specifier}"`).toBeNull();
         }
      });
   }
});

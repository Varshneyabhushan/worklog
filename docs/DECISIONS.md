# Decision log

Why each significant choice was made. Dated YYYY-MM-DD.

---

## D1 — Node.js and TypeScript for the backend

**Choice:** TypeScript on Node 22, Express 5, zod, pino, vitest, over Python and FastAPI.

**Why:** the user's choice; it is also the reference stack of the use-case-architecture skill, and
the MCP Apps SDK is TypeScript-first.

**Rejected:** Next.js — the MCP App still needs a single-file Vite build, and Next's bundling works
against one composition root and a long-running process (MCP endpoint, SSE, snapshot worker).

**Update 2026-11-03:** TypeScript stays on 5.9 rather than the native 7.0 compiler until the rest of
the toolchain (ts-node, vitest) supports it.

---

## D2 — SQLite via better-sqlite3, on the WSL disk, with a nightly SQL dump

**Choice:** one SQLite file at `~/.local/share/worklog/worklog.db`, opened only by this service;
`export_backup` writes the whole database as SQL text into the notes repo, which the night routine
commits.

**Why:** a single local writer needs no server; FTS5 gives full-text search; the text dump diffs
in git where the binary file would not. `node:sqlite` is still experimental on Node 22.

**When this would change:** if anything other than this process needs to write the data.

---

## D3 — A task owns its events; times are read from them

**Choice:** `Task` holds current state plus its event history. `createdAt`, `pickedAt`, `doneAt`
and `waitingSince` are getters over the events; `moveTo`, `change`, `record` and `undo` are the
only ways to change a task, each appending the event that explains it.

**Why:** stored times drift from the history; making the class the only way to change a task turns
"every change is an event" from a convention into a guarantee. Loading every event with its task is
negligible at a single user's scale.

**Rejected:** separate `Task` and `TaskEvent` objects with a read model — any code path could
change a task without writing the event.

---

## D4 — Error families instead of per-use-case error re-exports

**Choice:** four base classes in `utils/errors.ts` (`InvalidInputError`, `InvariantError`,
`NotFoundError`, `ConflictError`). Every layer's errors extend one; adapters map families to
statuses with one `instanceof` chain, and the class name gives the code.

**Why:** the skill's per-use-case `errors.ts` re-exports and per-endpoint mapping would mean ~29
re-export files and the same mapping repeated across ~30 routes and ~26 MCP tools, for no
difference in behaviour here.

**When this would change:** if another service consumes this API and needs a documented,
per-endpoint error contract.

---

## D5 — Tests run on SQLite `:memory:` rather than hand-written in-memory repositories

**Choice:** persistence, service and use-case tests use the real SQLite repositories over an
in-memory database.

**Why:** an in-memory fake would have to reimplement FTS5 search, JSON tag filters and the
done-in-range query; `:memory:` tests the real SQL at the same speed.

---

## D6 — The use-case graph is built in `src/app.ts`

**Choice:** `src/app.ts` wires repositories, services and use cases; `src/index.ts` handles
config, the database file, the HTTP server, the worker and shutdown.

**Why:** the tests build exactly the production graph instead of a hand-kept copy.

---

## D7 — Stateless MCP over streamable HTTP on the same Express app

**Choice:** `/mcp` creates a fresh MCP server and transport per request; the app is built with the
SDK's `createMcpExpressApp`, which validates the `Host` header for loopback binds.

**Why:** nothing is held between calls, so restarts and multiple clients need no session handling;
the Host check protects an unauthenticated localhost service from DNS rebinding.

---

## D8 — The review decision is not an MCP tool

**Choice:** `decideReview` is reachable only over REST, for the web UI (and later the MCP App's
UI-only tool).

**Why:** both Claude Code and Codex sessions act for the user through the same tools, so the
service cannot tell them apart; leaving the tool out is the only enforcement that holds.

---

## D9 — No Docker; a systemd user unit

**Choice:** `deploy/install.sh` renders `deploy/worklog.service.template` with the absolute node
path and enables it.

**Why:** a single-user service on the WSL host; the skill's Docker setup has nothing to isolate here.

---

## D11 — A marker line guards hand-written day files

**Choice:** reports start with a marker comment; `sign_off_day` refuses to overwrite a file
without it, before freezing anything.

**Why:** reports and the hand-written archive share a folder.

**Update 2026-11-03:** the guard was first tested live against a build that predated it and
overwrote `02-11-2026.md`; restored from git. Rebuild and restart before any live check.

---

## Open decisions / TODO

- Web UI and MCP App (`web/`): not built yet.
- Verify that the Claude Desktop Code tab renders MCP Apps, and that Codex connects to HTTP MCP.
- Whether WSL stays up with no terminal open; if not, a Windows login task that starts it.
- History import from the markdown archive; the worklog skill rewrite against these tools.

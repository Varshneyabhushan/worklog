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

**Choice:** `decideReview` is reachable over REST for the web UI, and as the MCP tool
`decide_review` only for the MCP App's view.

**Why:** both Claude Code and Codex sessions act for the user through the same tools, so the
service cannot tell them apart; leaving the tool out is the only enforcement that holds.

**Update 2026-11-03:** the MCP App needs the decision as a tool. It is marked
`visibility: ["app"]`, which a host with MCP Apps hides from the model, but a host without them
lists every tool. So the tool also requires a key generated at startup and written into the
view's HTML: a session would have to read the view's source to get it, which is not an
accident. A restart changes the key, so an open view must be reopened.

---

## D9 — No Docker; a systemd user unit

**Choice:** `deploy/install.sh` renders `deploy/worklog.service.template` with the absolute node
path and enables it.

**Why:** a single-user service on the WSL host; the skill's Docker setup has nothing to isolate here.

---

## D10 — Import the whole history, keeping every file verbatim

**Choice:** every day file becomes its day's note and frozen Summary as written; only checkbox
lines become tasks, their history rebuilt from the days they appear on.

**Why:** the older files are free-form engineering notes that no parser maps to tasks without
loss; keeping the text verbatim loses nothing and makes all of it searchable, while the
checkbox lines carry the structure worth having.

**Rejected:** making updates from Summary bullets — matching a bullet to its task is guesswork.

---

## D11 — A marker line guards hand-written day files

**Choice:** reports start with a marker comment; `sign_off_day` refuses to overwrite a file
without it, before freezing anything.

**Why:** reports and the hand-written archive share a folder.

**Update 2026-11-03:** the guard was first tested live against a build that predated it and
overwrote `02-11-2026.md`; restored from git. Rebuild and restart before any live check.

---

## D12 — One `web/` project builds the board and the MCP view

**Choice:** React and Vite in `web/`, with two builds: the board in `web/dist`, served by the
service at `/`, and the MCP view as one inlined HTML file in `web/dist/mcp`, which the MCP
adapter serves as `ui://worklog/today.html`. They share the types, the task card and the
styles. Plain CSS with custom properties; native drag and drop; a hash router.

**Why:** an MCP host loads a view from a single HTML document and the view reaches the service
only through tools, so it needs its own build, but the cards and shapes should not be written
twice. The board is one user's local tool: a CSS framework, a drag library and a router package
add more than they save.

**Rejected:** writing the review buttons to call REST from the view — the view's iframe would
need CORS on an unauthenticated service, which any web page could then use.

---

## D13 — Remarks: updates kept out of the Summary

**Choice:** an update carries `inSummary`, true by default. A remark (false) stays on the task's
timeline and in search but is left out of the Summary, the report and today's progress. The
skill posts a routine's status reports, such as the daily skill-evals red line, as remarks. A task
reaches the Summary only through an update that counts, so one finished with no update, or
only remarks, is ticked under `# TODOs` and nowhere else.

**Why:** the Summary feeds the timesheet and should hold work done. A red pipeline reported
every morning made the Summary repeat itself, while the same lines still belong on the task.

**Rejected:** using day notes for them, which loses the task; and a separate remarks table,
which would duplicate the update's history, editing and moving for one boolean.

---

## Open decisions / TODO

- Verify that the Claude Desktop Code tab renders the `show_today` view and keeps
  `decide_review` from the model, and that Codex connects to HTTP MCP.
- Whether WSL stays up with no terminal open; if not, a Windows login task that starts it.

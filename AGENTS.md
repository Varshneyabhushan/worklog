# AGENTS.md

Guidance for coding agents working in this repository. `CLAUDE.md` imports this file.

## Commands

Run from `server/`:

```bash
npm run dev                                       # nodemon + ts-node on src/
npm run build                                     # tsc -> dist/ (wipes dist first)
npm start                                         # node dist/index.js
npm test                                          # vitest run, architecture test included
npx vitest run tests/useCases/days.test.ts        # one file
npx vitest run -t "signs a day off"               # one test by name
npm run typecheck                                 # src and tests
npm run format                                    # prettier
```

## Local setup

```bash
cp sample.env .env          # set WORKLOG_REPORT_ROOT; every variable is documented there
npm ci && npm run dev       # http://127.0.0.1:8765, MCP at /mcp
./deploy/install.sh         # build and run as a systemd user service instead
```

A healthy boot logs `✅ database …` then `✅ listening on …`.

Gotchas:
- Keep the data folder on the WSL disk. SQLite locking is unreliable on `/mnt/c`; only the day
  reports and the SQL backup go there.
- **A code change only reaches the running service after `npm run build` and
  `systemctl --user restart worklog`** (or `./deploy/install.sh`). Check against the restarted
  service, never against data you can't restore.
- The service has no authentication. It binds to loopback, and the MCP SDK's Host check refuses
  requests whose `Host` isn't loopback (DNS rebinding).
- `deploy/install.sh` bakes the absolute `node` path into the unit, because nvm's node is not on
  systemd's PATH. Rerun it after switching Node versions.

## What this service is

The store behind the worklog skill: tasks with their history, progress updates, day notes,
meetings, and each day's frozen Summary. Claude Code and Codex reach it over MCP, the web UI over
REST and `/events`. At sign-off it writes the day's markdown report, which is output only.
Requirements: `docs/requirements.md`.

## Architecture

Follows the **use-case-architecture** skill. Layering is enforced by `tests/architecture.test.ts`.

Repo-specific notes:
- `src/app.ts` builds the use-case graph; `src/index.ts` owns the process (config, database file,
  listening, shutdown). Tests build the same graph over `:memory:` through `tests/fakes/app.ts`.
- Errors come in four families in `utils/errors.ts`. Adapters map a family to a status code; the
  class name is the error code (`TaskNotFoundError` → `TASK_NOT_FOUND`). See `docs/DECISIONS.md`.
- `adapters/workers/todaySnapshot.ts` keeps `today.json` current for the `/today` pane.
- `migration/` (pure parsing of the old markdown day files) and `src/importHistory.ts` (the
  one-off import, run once on 03-11-2026) stay for reference; the importer refuses a
  database that already has data.

## Domain concepts

- **Task**: an aggregate that owns its events. Status, wait reason and fields are current state;
  every change appends an event, and created, picked, done and waiting times are read from the
  events. Statuses: backlog, picked, in_review, done, dropped. Sub-tasks are one level deep.
- **Update**: a progress note on one task, belonging to the day it was posted. Every update of a
  day goes into that day's Summary.
- **Day**: a calendar date in the configured time zone, owning its notes and, once signed off, its
  frozen Summary. Notes, unlike updates, may be added to an earlier day.
- **Meeting**: a schedule entry with exact start and end instants; not a task.

## Invariants

- **Only the user leaves review.** `decideReview` is exposed over REST for the UI and has no MCP
  tool. `moveTask` refuses a task in review.
- **A task's stored status equals its history's replay.** `assertValidHistory` checks it on every
  write; an undo event is the only move allowed outside the transition table.
- **Source keys are unique across all tasks**, closed ones included, so a recurring problem
  reopens its task instead of creating a second one.
- **The day report is generated, never edited.** Signing a day off again rewrites it.

## Design docs

`docs/requirements.md` is the agreed behaviour and `docs/DECISIONS.md` the reasons. Update them
in the same change when the design changes.

## Working agreements

- Stage changes and stop; the user reviews the staged diff before anything is committed.
- Commits: short, imperative, lowercase.

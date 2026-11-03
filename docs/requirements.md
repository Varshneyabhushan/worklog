# Worklog service: requirements

Status: agreed 02-11-2026. Code layout and implementation are not covered here; they come next.

## 1. Purpose

Replace the markdown-file worklog with a task store that Claude (and Codex) read and write
through MCP, and generate each day's markdown report from it at sign-off.

Today one markdown file per day is the task store, the UI and the report at once. That forces
the whole format to be parsed twice (Python scripts and the `/today` pane), copies open tasks
into a new file every morning so a task has no identity or history, and makes every Claude edit
an exact-text replace on a file open in an editor on `/mnt/c`.

The service holds the **data**. The worklog skill keeps the **procedure**: the morning and
night routines, `az` / `gh` / Linear / git steps, and the rules on wording and approval.

## 2. Shape

| Item | Decision |
|---|---|
| Repo | `~/repos/worklog`, local git |
| Process | Node.js (TypeScript) service exposing MCP over streamable HTTP on `127.0.0.1:<port>`, run as a systemd user service in WSL |
| Store | SQLite at `~/.local/share/worklog/worklog.db` (WSL disk, never `/mnt/c`); the service is the only process that opens it |
| Clients | Claude Code (terminal and the Desktop Code tab) and Codex, both over MCP. The Desktop Chat tab is out of scope |
| Human interfaces | a local web UI served by the same process, and an MCP App rendered inside Claude |
| Backup | the night routine runs a `.dump` of the database to `notes/worklog/db/worklog.sql` and commits it with the day's report. The binary `.db` is never committed |
| Rules | the skill holds every instruction. An `AGENTS.md` mirrors the data rules for Codex. Tool descriptions say only what a tool does and takes |

The service enforces what code can check: valid dates, normalised tag names, one level of
sub-tasks, legal status transitions, known ids. It does not pretend to enforce approval of
wording, which only the skill's conversation can establish.

## 3. Tasks

### 3.1 Fields

| Field | Notes |
|---|---|
| `id` | short and readable, `W-142` |
| `title` | the task as you would say it |
| `description` | **required**, markdown, editable. The brief: what the task is. Suggested shape Goal / Context / Done when, not enforced. Every edit is recorded as an event |
| `status` | see 3.2 |
| `priority` | `high` / `normal` / `low`, default `normal`. For a task from a Linear ticket, Claude suggests the ticket's priority and you set it |
| `due` | optional, date only. Set only for a real deadline, never invented |
| `blocked_on`, `blocked_since` | the waiting field: free-text reason and since-when. Can sit on any open status |
| `tags` | zero or more, lowercase-hyphenated. The **first tag is the display group** in `/today`, the UI and the report; the rest are for search. No tag → group "Other". Existing tags are offered for reuse; rename / merge exist for clean-up |
| `parent_id` | one level of sub-tasks only |
| `links` | list of `{kind, url, label}`, kind ∈ `ticket` / `pr` / `slack` / `artifact` / `meeting` / `other`. The first link is primary. A `ticket` link gives the task its chip |
| `assignee` | `self` or an **agent name** (e.g. `investigator`), not the tool it runs on. Free text for now, with existing names suggested |
| `source_key` | optional, unique across **all** tasks: `linear:ABC-123`, `gh:org/repo#31`, `slack-todo:<permalink>`, `pipeline:<id>`. Set automatically from a ticket or PR link |
| `imported_from` | source file path, for imported tasks |
| `createdAt`, `pickedAt`, `doneAt`, `waitingSince` | not stored: read from the task's events |

Not included: estimates, time tracking, watchers, multiple assignees.

### 3.2 Statuses

`backlog` → `picked` → `in_review` → `done`, plus `dropped`.

- `backlog`: real work, not on your plate yet.
- `picked`: on your plate. Stays picked across days until you change it. The morning routine
  flags stale picks ("picked 5 days ago, no update since 26-10").
- `in_review`: a session believes its part is finished. Waits for you.
- `done`: finished, timestamped.
- `dropped`: abandoned, kept for history, never shown as pending.

Waiting is **not** a status: `blocked_on` can sit on `backlog`, `picked` or `in_review`.

Transitions:
- Any session may move a task to `in_review`, with an update saying what was done and what to check.
- **Moving out of `in_review` (to `done`, or back to `picked` with a review update) is possible
  only from the web UI or the MCP App.** It is exposed as a UI-only tool hidden from the model,
  so no Claude or Codex session can call it.
- Your own tasks may go `picked` → `done` directly, through any interface.
- A `done` task is not picked again except by an explicit `reopen`.

### 3.3 Sort order

In `/today`, the board, the list and the backlog:

1. overdue
2. due today
3. `high`
4. `normal`, then `low`, each by soonest due, then oldest pick

Waiting tasks form their own group, with how long they have waited.

### 3.4 Routine-created tasks and reopening

- Routines (morning pipeline check, Linear assigned tickets, Slack To-dos, unmerged PRs) create
  tasks through an upsert keyed on `source_key`. An existing task gets its title and links
  refreshed; status, priority, tags and updates are left alone. A new task gets a description
  the routine writes from its source (ticket summary, PR body, failing graders).
- If a routine finds that a `done` task's problem is back, it **reopens** that task with a
  `by: routine` update saying why. Reopening is an event, so the reopen count is visible
  (`↻3`).
- `reopen` takes the target status, `picked` or `backlog`. The service does not choose; the
  skill decides per source from rules you write ("pipeline RED → picked").
- A `dropped` task is never reopened automatically. The routine tells you and reopens only on your yes.

### 3.5 Search

Full-text search (SQLite FTS5) over task titles, descriptions, updates and day notes,
combinable with tags, status, assignee and a date range.

## 4. Updates

- An update is a timestamped milestone on one task. Every task update belongs to a task.
- `by: self`: wording you approved at the time (the skill drafts, you say yes). A session you
  are driving, Claude Code or Codex, counts as `self`.
- `by: routine`: factual status lines written by a routine without approval.
- A day's Summary is every update posted that day, `self` and `routine` alike; `by` is only a label.
- An update belongs to the day it was posted, as in Linear. There is no backdating: an update
  remembered late is posted today, with a prefix in its body saying which day it is about
  (e.g. "(for 30-10) …").
- Claude never rewrites an update on its own; a correction or reword happens only on your word,
  and new facts are new updates. An edit is recorded on the task with the old and new wording.
- An update can be moved to the right task, or deleted. A deleted update is gone; the task's
  history records only that it was deleted.
- `log_work` creates a task and its first update in one call, as `done` or `picked`, for
  unplanned work. It may be a sub-task of the task it came out of.
- A task may be marked `done` with no update. It shows in the report as its title with ✓, and
  the night routine lists such tasks as gaps for you to fill or leave.

## 5. Days

- Calendar days, IST, midnight boundary. Every update and event belongs to the day it
  happened, whenever the day is signed off.
- A `days` record per date holds that day's **notes** and, once signed off, its **frozen
  Summary**. A day owns its notes.
- Day notes are free entries for the day that belong to no task: plain text, no tags or links.
  They come in through the skill. Unlike updates, a note may be added to an earlier day,
  because that day's Summary matters; on a signed-off day it means signing that day off again.
- **A day closes only when you run the night routine.** Nothing closes a day in the background.
  An unclosed day keeps taking that day's activity. The morning routine and the web UI warn
  about earlier days not signed off ("21-10 not signed off").
- `night DD-MM-YYYY` builds that day's report from that day's activity only. Re-running it
  regenerates that day's frozen Summary and file; that is the only way a past day changes.

## 6. Meetings

A separate `schedule` table, not tasks: start and end instants, title, join link, source
(`calendar` / `manual`), and a `cancelled` flag.

- Filled by the morning calendar step or added by you. A meeting without a time is a task, not a meeting.
- A manual entry may have no end; it counts as over once it starts.
- Never carried over, never in the Summary, no ticking: shown upcoming, in progress or over by the clock.
- Work that comes out of a meeting is an ordinary task, optionally linked to it.

## 7. Routine steps

The morning and night routines, their steps and the day's progress through them belong
entirely to the worklog skill. The service stores none of it.

## 8. Events and undo

- Every change to a task is an event in its history (create, field change, status change, pick,
  unpick, reopen, wait, update added / edited / moved / deleted, description edit). A task
  carries its events; its created, picked, done and waiting times are read from them.
- `undo` reverts the last change, or a named one, by writing a reversing event.
- There is no hard delete for tasks: a mistaken task is `dropped` with reason "created by mistake".
- `purge` truly deletes a task or day note (e.g. a secret pasted into one), only when you ask for
  it by name. A mistaken update is simply deleted.
- Assignment changes are events too; a future dispatcher would subscribe to them (§12).

## 9. Outputs

### 9.1 Day report (markdown)

- Path unchanged: `notes/worklog/<month> <year>/DD-MM-YYYY.md`, full lowercase month name.
- **Fully generated** at sign-off from the `days` record and that day's activity; nothing is
  typed into it by hand.
- Headings kept compatible with the timesheet skill's extractor, which reads `# TODOs` and `# Summary`
  and stays unchanged:
  - `# TODOs`: the day's tasks as checkboxes, `- [x]` done that day, `- [ ]` still open, with
    `⌛` and wait length.
  - `# Summary`: per first tag, task → that day's updates, ✓ on tasks done that day.
  - `# Notes`: the day notes.
- Old day files stay as they are, a read-only archive. Every generated report starts with a
  marker line, and sign-off refuses to overwrite a file without it, checked before anything is
  frozen.

### 9.2 `/today` pane

Reads a `today.json` snapshot the service rewrites after every change. Top to bottom:

1. Schedule: past entries dimmed, cancelled struck through
2. For review
3. Picked: grouped by first tag, in sort order; id, chip, ↗ link, due badge, reopen count,
   sub-tasks indented
4. Waiting: reason and wait length
5. Today's progress: done today and today's updates
6. Day notes
7. Backlog: collapsed to a count

Anything older than today is left out, except wait lengths.

### 9.3 Web UI (v1)

Served by the service on `127.0.0.1`.

- **Board:** Backlog / Picked / In review / Done (today) columns, Waiting as a card badge,
  drag between columns. Dragging out of In review is the UI-only review action.
- **List:** the same tasks in sort order, filtered by tag, status, assignee and full-text search.
- **Task page:** title, editable description, fields, links, sub-tasks, updates timeline, add-update box.
- **Day-end banner:** when an earlier day is not signed off. It points you to the night routine
  and does not close the day itself, because closing needs your approval of the Summary and
  the git commit.
- **Day notes:** list of days, each with its notes and frozen Summary, read from the database,
  not the markdown.
- Not in v1: editing meetings, settings, a theme toggle (follows the system).

### 9.4 MCP App

A smaller version of the web UI rendered inside Claude: the `/today` view plus task cards
carrying the UI-only review buttons. The `show_today` tool renders it; `decide_review` is
marked app-only and also requires a key the service writes into the view's HTML, so a host
without MCP Apps, which lists every tool, still cannot call it. Whether `/today` stays a separate
pane or becomes this MCP App is decided once the Code tab is seen rendering it (see §11).

## 10. Migration

Done 03-11-2026 with `src/importHistory.ts`: every day file, not just the open items.

- **Each file** → that day's day note, verbatim, and its `# Summary` → the day's frozen
  Summary; every imported day counts as signed off.
- **Checkbox lines** → tasks, one per piece of work across days: a carried-over line matches by
  its text, by a text that only grew, or by its first link. Its history is rebuilt from the days
  it appears on (created on the first, done the day it was ticked, dropped the day it got ❌),
  at midday IST in order. An unticked line that disappeared is dropped on the day it vanished;
  a file with no checkboxes doesn't count as a vanishing day.
- `##` area → first tag; nested checkboxes → sub-tasks of the top-level line; plain
  sub-bullets → the description, with the original line and source file; `⌛ reason` →
  `blockedOn`, `⌛ postponed` → `backlog`; links typed by URL; trailing `- [slack](…)`-style
  deep links kept as links, not title words.
- Timed meeting lines → meetings on that day.
- Not imported: the sign-in / sign-off checklists. No updates are made up from Summary bullets.
- Open tasks with a ticket or PR link got their source key.
- The importer refuses a database that already has tasks or days; without `--write` it applies
  the plan to an in-memory copy and reports, so a dry run exercises every rule.
- Result: 209 days, 997 tasks (12 open, matching `02-11-2026.md`), 1,500 events, 136
  meetings, no failures. The worklog skill and the `/today` pane moved to the service the same
  day; the old skill and pane are kept in `~/.claude/backups/`.

## 11. To verify at build time

- MCP Apps: that the Desktop Code tab renders the `show_today` view and hides `decide_review`
  from the model.
- Codex: that it can connect to an HTTP MCP server, not only one it launches itself.
- WSL: whether WSL stays up with no terminal open; if it idles out, a Windows login task
  that starts it.
- Timesheet extractor: that it reads the generated `# TODOs` / `# Summary` correctly.

## 12. Deferred (design must not block these)

| Item | Hook already in the design |
|---|---|
| Pushing the notes repo to its remote | none needed; separate work |
| Timesheet skill reading from the MCP | the report keeps its headings meanwhile |
| The service starting agents on assignment | `assignee` + assignment events; a dispatcher subscribes later |
| Work sessions and claims on a task | not modelled yet; updates are append-only, so concurrent writers cannot clobber each other |
| Agent attribution on updates (`by: <agent>`) | `by` is already a field; new values only |
| Actors / experts table | `assignee` values map onto its rows |

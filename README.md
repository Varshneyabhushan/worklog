# worklog

A local service that keeps my worklog: tasks with their history, progress updates, day notes and
meetings, with each day's markdown report generated at sign-off. Claude Code and Codex use it over
MCP, and the web board at http://127.0.0.1:8765 uses its REST API.

```bash
cd server
cp sample.env .env      # set WORKLOG_REPORT_ROOT
npm ci && npm run dev   # http://127.0.0.1:8765, MCP at http://127.0.0.1:8765/mcp
cd ../web && npm ci && npm run build   # the board and the MCP view, served by the service
```

Run it as a systemd user service with `server/deploy/install.sh`, and register it with Claude Code:

```bash
claude mcp add --transport http worklog http://127.0.0.1:8765/mcp
```

Details for contributors and agents: [AGENTS.md](AGENTS.md). Requirements:
[docs/requirements.md](docs/requirements.md). Decisions: [docs/DECISIONS.md](docs/DECISIONS.md).

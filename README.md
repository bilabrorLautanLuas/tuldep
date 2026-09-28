# Tuldep

A local dev tool for managing multiple project processes from one dashboard —
start/stop, live log streaming, all local, no auth.

## Install

```bash
bun install
```

## Run

From the root — starts both at once (API on http://localhost:4100,
dashboard on http://localhost:5273):

```bash
bun run dev
```

Or run just one, in its own terminal:

```bash
# API only
cd apps/server
bun run dev
```

```bash
# dashboard only
cd apps/web
bun run dev
```

> Ports 4100/5273 (instead of the more common 4000/5173) were picked because
> another local service was already using 4000/5173 on the dev machine. If
> that's not an issue for you, feel free to change `PORT` in
> `apps/server/src/index.ts`, the CORS `origin` next to it, the port in
> `apps/web/vite.config.ts`, and the `BASE_URL`/WebSocket URL in
> `apps/web/src/api.ts` / `apps/web/src/useProjectLogs.ts` back to the defaults.

Open `http://localhost:5273`, add a project (name, working directory, command),
click **Start**, click the card to watch its logs stream live, **Stop** it,
and **Delete** it when done.

## Notes / known limitations

- No auth, no multi-user support — this is a single-user local tool.
- Process status lives in memory only. If the server restarts, any processes
  it had spawned become untracked orphaned OS processes (Tuldep won't know
  about them anymore, though they keep running).
- The last 500 log lines per project are kept in an in-memory ring buffer
  (resets on server restart) for instant replay when you reopen the log
  panel; the full history is also written to `apps/server/data/logs/<id>.log`.
- On Windows, commands run via `cmd /c`, which re-parses the command string
  itself — this means commands with nested double quotes (e.g.
  `node -e "some(); code()"`) can silently misbehave due to `cmd.exe`'s own
  quoting rules, independent of Tuldep. Prefer running a script file
  (`node script.js`) or a simple command over a heavily quoted one-liner.
- DB connection/script running (Postgres/MongoDB) has its schema defined in
  `packages/shared` and its persistence layer in `apps/server/src/db.ts`, but
  no API routes or UI yet — that's for a future session.

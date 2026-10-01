// Runs apps/server and apps/web together and shuts both down cleanly on Ctrl+C.
// `bun run --filter` doesn't forward termination to its children on Windows, so Ctrl+C
// left the terminal hanging with orphaned server/vite/project processes.
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const apps = ["server", "web"];

const children = apps.map((app) =>
  Bun.spawn({
    cmd: [process.execPath, "run", "dev"],
    cwd: resolve(root, "apps", app),
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
  }),
);

let shuttingDown = false;

function killTree(pid: number): void {
  if (process.platform === "win32") {
    // also takes down project processes the server spawned (cmd /c ... children)
    Bun.spawnSync(["taskkill", "/pid", String(pid), "/t", "/f"], { stdout: "ignore", stderr: "ignore" });
  } else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // already exited
    }
  }
}

function shutdown(code: number): void {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) killTree(child.pid);
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("SIGBREAK", () => shutdown(0));

// if either app dies on its own, stop the other one too
for (const child of children) {
  child.exited.then((code) => shutdown(code));
}

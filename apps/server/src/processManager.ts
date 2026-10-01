import type { Subprocess } from "bun";
import { dirname } from "node:path";
import type { Project, ProjectStatus } from "@tuldep/shared";
import * as logStore from "./logStore";

interface RunningProcess {
  proc: Subprocess<"ignore", "pipe", "pipe">;
  status: ProjectStatus;
  startedAt: number;
  stopRequested: boolean;
}

const runningProcesses = new Map<string, RunningProcess>();

function platformCmd(command: string): string[] {
  return process.platform === "win32" ? ["cmd", "/c", command] : ["sh", "-c", command];
}

function killWindowsTree(pid: number): void {
  // cmd /c spawns the real command as a child of cmd.exe; a plain kill() only
  // terminates cmd.exe and leaves the actual process (e.g. redis-server.exe)
  // running and still holding its port. taskkill /t kills the whole tree.
  Bun.spawnSync(["taskkill", "/pid", String(pid), "/t", "/f"]);
}

async function pumpStream(stream: ReadableStream<Uint8Array>, projectId: string): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      logStore.appendLine(projectId, line);
    }
  }
  if (buffer.length > 0) logStore.appendLine(projectId, buffer);
}

export function startProject(project: Project): ProjectStatus {
  const existing = runningProcesses.get(project.id);
  if (existing?.status === "running") {
    return existing.status;
  }

  const env: Record<string, string | undefined> = { ...process.env, ...project.env };
  if (project.engine) {
    // prepend the chosen engine's bin dir so "npm run dev" / "php artisan serve" resolve to it first
    const engineDir = dirname(project.engine.path);
    const pathSep = process.platform === "win32" ? ";" : ":";
    // Windows env keys are case-insensitive and usually spelled "Path"; writing env.PATH would add a
    // second key next to it and the child would keep resolving through the original "Path".
    const pathKey = Object.keys(env).find((k) => k.toLowerCase() === "path") ?? "PATH";
    env[pathKey] = `${engineDir}${pathSep}${env[pathKey] ?? ""}`;
  }

  const proc = Bun.spawn({
    cmd: platformCmd(project.command),
    cwd: project.cwd,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });

  const entry: RunningProcess = {
    proc,
    status: "running",
    startedAt: Date.now(),
    stopRequested: false,
  };
  runningProcesses.set(project.id, entry);

  pumpStream(proc.stdout as ReadableStream<Uint8Array>, project.id);
  pumpStream(proc.stderr as ReadableStream<Uint8Array>, project.id);

  proc.exited.then((exitCode) => {
    const current = runningProcesses.get(project.id);
    if (!current || current.proc !== proc) return;
    if (current.stopRequested) {
      current.status = "stopped";
      return;
    }
    current.status = exitCode === 0 ? "stopped" : "crashed";
  });

  return entry.status;
}

export async function stopProject(id: string): Promise<ProjectStatus> {
  const entry = runningProcesses.get(id);
  if (!entry || entry.status !== "running") {
    return entry?.status ?? "stopped";
  }

  entry.stopRequested = true;

  if (process.platform === "win32") {
    killWindowsTree(entry.proc.pid);
    await entry.proc.exited;
  } else {
    entry.proc.kill();

    const timedOut = await Promise.race([
      entry.proc.exited.then(() => false),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 3000)),
    ]);
    if (timedOut) {
      entry.proc.kill("SIGKILL");
      await entry.proc.exited;
    }
  }

  entry.status = "stopped";
  return entry.status;
}

export function getStatus(id: string): ProjectStatus {
  return runningProcesses.get(id)?.status ?? "stopped";
}

export function listRunning(): Array<{ id: string; status: ProjectStatus; startedAt: number }> {
  return Array.from(runningProcesses.entries()).map(([id, entry]) => ({
    id,
    status: entry.status,
    startedAt: entry.startedAt,
  }));
}

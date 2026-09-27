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
    env.PATH = `${engineDir}${pathSep}${process.env.PATH ?? ""}`;
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
  entry.proc.kill();

  const timedOut = await Promise.race([
    entry.proc.exited.then(() => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 3000)),
  ]);
  if (timedOut) {
    entry.proc.kill("SIGKILL");
    await entry.proc.exited;
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

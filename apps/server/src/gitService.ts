import { stat } from "node:fs/promises";
import type { GitCommit, GitInfo, GitPullResult } from "@tuldep/shared";

const INFO_TIMEOUT_MS = 10_000;
const PULL_TIMEOUT_MS = 60_000;

interface GitRun {
  code: number;
  stdout: string;
  stderr: string;
}

async function dirExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

// GIT_TERMINAL_PROMPT=0 so a pull that needs credentials fails fast instead of hanging on a prompt nobody sees.
async function runGit(cwd: string, args: string[], timeoutMs: number): Promise<GitRun> {
  let proc;
  try {
    proc = Bun.spawn({
      cmd: ["git", ...args],
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch {
    return { code: -1, stdout: "", stderr: "git not found — is git installed and on PATH?" };
  }
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try {
      proc!.kill();
    } catch {
      // already exited
    }
  }, timeoutMs);
  try {
    // drain pipes while waiting so large output can't fill the buffer and block the process
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    return timedOut
      ? { code: -1, stdout, stderr: `${stderr}\ngit timed out after ${timeoutMs / 1000}s`.trim() }
      : { code, stdout, stderr };
  } catch (err) {
    return { code: -1, stdout: "", stderr: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

// Parses `git status --porcelain=v2 --branch`.
export function parseStatus(out: string): GitInfo {
  let oid = "";
  let head = "";
  let hasUpstream = false;
  let ahead: number | null = null;
  let behind: number | null = null;
  let dirty = false;

  for (const line of out.split("\n")) {
    if (!line) continue;
    if (line.startsWith("# branch.oid ")) oid = line.slice("# branch.oid ".length).trim();
    else if (line.startsWith("# branch.head ")) head = line.slice("# branch.head ".length).trim();
    else if (line.startsWith("# branch.upstream ")) hasUpstream = true;
    else if (line.startsWith("# branch.ab ")) {
      const m = line.match(/\+(\d+) -(\d+)/);
      if (m) {
        ahead = Number(m[1]);
        behind = Number(m[2]);
      }
    } else if (!line.startsWith("#")) dirty = true;
  }

  const detached = head === "(detached)";
  // detached HEAD has no name — show the short SHA instead (initial repos have no commit yet, oid is "(initial)")
  const branch = detached ? (oid && oid !== "(initial)" ? oid.slice(0, 7) : null) : head || null;
  return { isRepo: true, branch, detached, dirty, hasUpstream, ahead, behind };
}

// Parses `git log -1 --format=%h%x1f%an%x1f%cI%x1f%s%x1f%b`. Unit separator between fields because messages can
// contain anything printable; the body goes last since it's the only field that spans lines.
export function parseCommit(out: string): GitCommit | null {
  const [hash, author, date, subject, ...body] = out.split("\x1f");
  if (!hash?.trim() || !date) return null;
  return {
    hash: hash.trim(),
    subject: subject ?? "",
    body: body.join("\x1f").trim(),
    author: author ?? "",
    date,
  };
}

async function getHeadCommit(cwd: string): Promise<GitCommit | null> {
  const res = await runGit(cwd, ["log", "-1", "--format=%h%x1f%an%x1f%cI%x1f%s%x1f%b"], INFO_TIMEOUT_MS);
  // non-zero on a repo with no commits yet — that's "no commit", not an error
  return res.code === 0 ? parseCommit(res.stdout) : null;
}

export async function getGitInfo(cwd: string): Promise<GitInfo> {
  if (!(await dirExists(cwd))) return { isRepo: false };
  const res = await runGit(cwd, ["status", "--porcelain=v2", "--branch"], INFO_TIMEOUT_MS);
  if (res.code === 0) return { ...parseStatus(res.stdout), commit: await getHeadCommit(cwd) };
  if (/not a git repository/i.test(res.stderr)) return { isRepo: false };
  return { isRepo: false, error: res.stderr.trim() || "git status failed" };
}

export async function pullProject(cwd: string): Promise<GitPullResult> {
  if (!(await dirExists(cwd))) {
    return { success: false, output: "Project folder not found", info: { isRepo: false } };
  }
  // --ff-only: never create a surprise merge commit; diverged branches fail with a clear git message
  const res = await runGit(cwd, ["pull", "--ff-only"], PULL_TIMEOUT_MS);
  const output = [res.stdout, res.stderr].map((s) => s.trim()).filter(Boolean).join("\n");
  return { success: res.code === 0, output, info: await getGitInfo(cwd) };
}

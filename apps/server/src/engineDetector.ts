import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { DetectedEngine, EngineType } from "@tuldep/shared";

const CACHE_TTL_MS = 5 * 60 * 1000;
const VERSION_CHECK_TIMEOUT_MS = 3000;
const isWindows = process.platform === "win32";

interface Candidate {
  path: string;
  source: string;
}

const cache = new Map<EngineType, { data: DetectedEngine[]; expiresAt: number }>();

async function pathExists(path: string): Promise<boolean> {
  try {
    return await Bun.file(path).exists();
  } catch {
    return false;
  }
}

async function listDirs(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => join(dir, e.name));
  } catch {
    return []; // dir doesn't exist / unreadable — that version manager just isn't installed here
  }
}

// Runs `{path} --version` with a hard timeout so one corrupt/broken symlink can't hang the scan.
async function checkVersion(path: string): Promise<string | null> {
  if (!(await pathExists(path))) return null;
  let proc;
  try {
    proc = Bun.spawn({ cmd: [path, "--version"], stdout: "pipe", stderr: "pipe" });
  } catch {
    return null;
  }
  const timer = setTimeout(() => {
    try {
      proc!.kill();
    } catch {
      // already exited
    }
  }, VERSION_CHECK_TIMEOUT_MS);
  try {
    const exitCode = await proc.exited;
    if (exitCode !== 0) return null;
    return (await new Response(proc.stdout).text()).trim();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseNodeVersion(raw: string): string | null {
  return raw.match(/v?(\d+\.\d+\.\d+)/)?.[1] ?? null;
}

function parsePhpVersion(raw: string): string | null {
  return raw.match(/PHP (\d+\.\d+\.\d+)/)?.[1] ?? null;
}

function parseVersion(type: EngineType, raw: string): string | null {
  return type === "node" ? parseNodeVersion(raw) : parsePhpVersion(raw);
}

function nodeBinPath(installRoot: string): string {
  return isWindows ? join(installRoot, "node.exe") : join(installRoot, "bin", "node");
}

async function findNodeCandidates(): Promise<Candidate[]> {
  const home = homedir();
  const candidates: Candidate[] = [];

  for (const dir of await listDirs(join(home, ".nvm", "versions", "node"))) {
    candidates.push({ path: join(dir, "bin", "node"), source: "nvm" });
  }

  // nvm-windows (nvm4w): version dirs sit directly under NVM_HOME, binary at the root (no bin/ subfolder)
  const nvmWinHome = process.env.NVM_HOME || join(home, "AppData", "Local", "nvm");
  for (const dir of await listDirs(nvmWinHome)) {
    candidates.push({ path: join(dir, "node.exe"), source: "nvm" });
  }

  for (const base of [
    join(home, ".local", "share", "fnm", "node-versions"),
    join(home, ".fnm", "node-versions"),
    join(home, "AppData", "Roaming", "fnm", "node-versions"),
  ]) {
    for (const dir of await listDirs(base)) {
      candidates.push({ path: nodeBinPath(join(dir, "installation")), source: "fnm" });
    }
  }

  for (const base of [
    join(home, ".volta", "tools", "image", "node"),
    join(process.env.LOCALAPPDATA ?? join(home, "AppData", "Local"), "Volta", "tools", "image", "node"),
  ]) {
    for (const dir of await listDirs(base)) {
      candidates.push({ path: nodeBinPath(dir), source: "volta" });
    }
  }

  // Laragon: a very common local dev stack on Windows, bundles several Node versions side by side
  for (const dir of await listDirs("C:\\laragon\\bin\\nodejs")) {
    candidates.push({ path: join(dir, "node.exe"), source: "laragon" });
  }

  return candidates;
}

async function findPhpCandidates(): Promise<Candidate[]> {
  const home = homedir();
  const candidates: Candidate[] = [];

  for (const dir of await listDirs(join(home, ".phpbrew", "php"))) {
    candidates.push({ path: join(dir, "bin", "php"), source: "phpbrew" });
  }

  for (const base of ["/opt/homebrew/opt", "/usr/local/opt"]) {
    for (const dir of await listDirs(base)) {
      if (dir.split(/[\\/]/).pop()?.startsWith("php@")) {
        candidates.push({ path: join(dir, "bin", "php"), source: "homebrew" });
      }
    }
  }

  // Laragon bundles several PHP versions side by side too
  for (const dir of await listDirs("C:\\laragon\\bin\\php")) {
    candidates.push({ path: join(dir, "php.exe"), source: "laragon" });
  }

  return candidates;
}

async function findSystemBinary(bin: string): Promise<string | null> {
  try {
    const proc = Bun.spawn({ cmd: isWindows ? ["where", bin] : ["which", bin], stdout: "pipe", stderr: "pipe" });
    const exitCode = await proc.exited;
    if (exitCode !== 0) return null;
    const output = (await new Response(proc.stdout).text()).trim();
    return output.split(/\r?\n/)[0]?.trim() || null;
  } catch {
    return null;
  }
}

async function probe(candidate: Candidate, type: EngineType): Promise<DetectedEngine | null> {
  const raw = await checkVersion(candidate.path);
  if (!raw) return null;
  const version = parseVersion(type, raw);
  if (!version) return null;
  return { type, version, path: candidate.path, source: candidate.source };
}

async function detectEngines(type: EngineType): Promise<DetectedEngine[]> {
  const candidates = type === "node" ? await findNodeCandidates() : await findPhpCandidates();
  const systemBin = await findSystemBinary(type === "node" ? (isWindows ? "node.exe" : "node") : isWindows ? "php.exe" : "php");
  const all = systemBin ? [...candidates, { path: systemBin, source: "system" }] : candidates;

  const results = await Promise.all(all.map((c) => probe(c, type)));

  const seen = new Set<string>();
  const found: DetectedEngine[] = [];
  for (const engine of results) {
    if (!engine) continue;
    const key = engine.path.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(engine);
  }
  return found;
}

async function getCached(type: EngineType, forceRefresh: boolean): Promise<DetectedEngine[]> {
  const cached = cache.get(type);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  const data = await detectEngines(type);
  cache.set(type, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

export function detectNodeVersions(forceRefresh = false): Promise<DetectedEngine[]> {
  return getCached("node", forceRefresh);
}

export function detectPhpVersions(forceRefresh = false): Promise<DetectedEngine[]> {
  return getCached("php", forceRefresh);
}

export async function verifyEngine(
  path: string,
  type: EngineType,
): Promise<{ valid: boolean; version?: string; error?: string }> {
  if (!(await pathExists(path))) {
    return { valid: false, error: "File not found" };
  }
  const raw = await checkVersion(path);
  if (raw === null) {
    return { valid: false, error: "Failed to run --version (timeout, not executable, or wrong binary)" };
  }
  const version = parseVersion(type, raw);
  if (!version) {
    return { valid: false, error: `Could not parse ${type} version from output` };
  }
  return { valid: true, version };
}

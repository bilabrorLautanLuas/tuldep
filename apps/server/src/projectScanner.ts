import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { ProjectDetectedType, ProjectSuggestion } from "@tuldep/shared";

export const DEFAULT_EXCLUDE_PATTERNS = ["node_modules", ".git", "dist", "build", ".next", "vendor"];

async function fileExists(path: string): Promise<boolean> {
  return Bun.file(path).exists();
}

async function detectProject(dir: string, name: string): Promise<ProjectSuggestion | null> {
  const hasArtisan = await fileExists(join(dir, "artisan"));
  const hasComposerJson = await fileExists(join(dir, "composer.json"));
  if (hasArtisan && hasComposerJson) {
    return { path: dir, name, detectedType: "laravel", suggestedCommand: "php artisan serve", env: {} };
  }

  const packageJsonPath = join(dir, "package.json");
  if (await fileExists(packageJsonPath)) {
    let scripts: Record<string, string> = {};
    try {
      const pkg = JSON.parse(await Bun.file(packageJsonPath).text());
      scripts = pkg.scripts ?? {};
    } catch {
      // malformed package.json — still a valid suggestion, just no script hints to go on
    }

    const isBun = (await fileExists(join(dir, "bun.lockb"))) || (await fileExists(join(dir, "bun.lock")));
    const detectedType: ProjectDetectedType = isBun ? "bun" : "node";
    const runner = isBun ? "bun run" : "npm run";
    const suggestedCommand = scripts.dev ? `${runner} dev` : scripts.start ? `${runner} start` : `${runner} dev`;

    return { path: dir, name, detectedType, suggestedCommand, env: {} };
  }

  return null;
}

async function walk(
  dir: string,
  depth: number,
  maxDepth: number,
  excludePatterns: string[],
  results: ProjectSuggestion[],
): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // unreadable directory (permissions, race, symlink loop) — skip silently
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || excludePatterns.includes(entry.name)) continue;
    const fullPath = join(dir, entry.name);

    const suggestion = await detectProject(fullPath, entry.name);
    if (suggestion) results.push(suggestion);

    if (depth < maxDepth) {
      await walk(fullPath, depth + 1, maxDepth, excludePatterns, results);
    }
  }
}

export async function scanForProjects(
  rootPath: string,
  maxDepth: number = 2,
  excludePatterns: string[] = DEFAULT_EXCLUDE_PATTERNS,
): Promise<ProjectSuggestion[]> {
  let stats;
  try {
    stats = await stat(rootPath);
  } catch {
    throw new Error(`Path not found or inaccessible: ${rootPath}`);
  }
  if (!stats.isDirectory()) {
    throw new Error(`Not a directory: ${rootPath}`);
  }

  const results: ProjectSuggestion[] = [];
  await walk(rootPath, 1, maxDepth, excludePatterns, results);
  return results;
}

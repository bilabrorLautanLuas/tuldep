import type {
  AvailableScriptsResponse,
  CreateDbConnectionInput,
  CreateDbScriptInput,
  CreateProjectInput,
  DbConnection,
  DbScript,
  DbScriptRunResult,
  DetectedEngine,
  EngineType,
  GitInfo,
  GitPullResult,
  ImportApplySummary,
  ImportPreviewItem,
  ImportResolution,
  MyIpInfo,
  Project,
  ProjectStatus,
  ProjectSuggestion,
  ProjectWithStatus,
  ScanSettings,
  TuldepConfigExport,
  UpdateDbConnectionInput,
  UpdateDbScriptInput,
  UpdateProjectInput,
  VerifyEngineResponse,
} from "@tuldep/shared";

const BASE_URL = "http://localhost:4100/api";

export async function listProjects(): Promise<ProjectWithStatus[]> {
  const res = await fetch(`${BASE_URL}/projects`);
  return res.json();
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  await fetch(`${BASE_URL}/projects/${id}`, { method: "DELETE" });
}

export async function clearAllProjects(): Promise<{ deleted: number }> {
  const res = await fetch(`${BASE_URL}/projects/clear`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmed: true }),
  });
  return res.json();
}

export async function startProject(id: string): Promise<{ status: ProjectStatus }> {
  const res = await fetch(`${BASE_URL}/projects/${id}/start`, { method: "POST" });
  return res.json();
}

export async function stopProject(id: string): Promise<{ status: ProjectStatus }> {
  const res = await fetch(`${BASE_URL}/projects/${id}/stop`, { method: "POST" });
  return res.json();
}

export async function clearProjectLog(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/projects/${id}/logs`, { method: "DELETE" });
  return res.json();
}

// Kept for symmetry with the backend contract (reads scripts from the project's
// saved cwd by id); the form itself uses getScriptsPreview below so it reflects
// whatever cwd is currently typed, in both create and edit mode.
export async function getAvailableScripts(id: string): Promise<AvailableScriptsResponse> {
  const res = await fetch(`${BASE_URL}/projects/${id}/available-scripts`);
  return res.json();
}

export async function getScriptsPreview(cwd: string): Promise<AvailableScriptsResponse> {
  const res = await fetch(`${BASE_URL}/scan/scripts-preview?cwd=${encodeURIComponent(cwd)}`);
  return res.json();
}

export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<{ project: Project; status: ProjectStatus; notice?: string }> {
  const res = await fetch(`${BASE_URL}/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function getProjectGit(id: string): Promise<GitInfo> {
  const res = await fetch(`${BASE_URL}/projects/${id}/git`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `git info failed (${res.status})`);
  }
  return res.json();
}

export async function pullProject(id: string): Promise<GitPullResult> {
  const res = await fetch(`${BASE_URL}/projects/${id}/git/pull`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `pull failed (${res.status})`);
  }
  return res.json();
}

export async function importProjects(suggestions: CreateProjectInput[]): Promise<Project[]> {
  const res = await fetch(`${BASE_URL}/projects/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ suggestions }),
  });
  return res.json();
}

// ---- Project auto-discovery ----

export async function getScanSettings(): Promise<ScanSettings> {
  const res = await fetch(`${BASE_URL}/scan-settings`);
  return res.json();
}

export async function saveScanSettings(input: Omit<ScanSettings, "id">): Promise<ScanSettings> {
  const res = await fetch(`${BASE_URL}/scan-settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function discoverProjects(input: { rootPath: string; maxDepth?: number }): Promise<ProjectSuggestion[]> {
  const res = await fetch(`${BASE_URL}/scan/discover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `scan failed (${res.status})`);
  }
  return res.json();
}

// ---- Engine detection (Node/PHP version per project) ----

export async function detectEngines(type: EngineType, refresh = false): Promise<DetectedEngine[]> {
  const res = await fetch(`${BASE_URL}/engines/detect?type=${type}${refresh ? "&refresh=true" : ""}`);
  return res.json();
}

export async function verifyEngine(path: string, type: EngineType): Promise<VerifyEngineResponse> {
  const res = await fetch(`${BASE_URL}/engines/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, type }),
  });
  return res.json();
}

// ---- DB connections ----

export async function listDbConnections(): Promise<DbConnection[]> {
  const res = await fetch(`${BASE_URL}/db-connections`);
  return res.json();
}

export async function createDbConnection(input: CreateDbConnectionInput): Promise<DbConnection> {
  const res = await fetch(`${BASE_URL}/db-connections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function updateDbConnection(id: string, input: UpdateDbConnectionInput): Promise<DbConnection> {
  const res = await fetch(`${BASE_URL}/db-connections/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function deleteDbConnection(id: string): Promise<void> {
  await fetch(`${BASE_URL}/db-connections/${id}`, { method: "DELETE" });
}

/** Deletes every connection plus (by cascade) all scripts and run history. */
export async function clearAllDbData(): Promise<{ deleted: number }> {
  const res = await fetch(`${BASE_URL}/db-connections/clear`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmed: true }),
  });
  return res.json();
}

export async function testDbConnection(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE_URL}/db-connections/${id}/test`, { method: "POST" });
  return res.json();
}

// ---- DB scripts ----

export async function listDbScripts(): Promise<DbScript[]> {
  const res = await fetch(`${BASE_URL}/db-scripts`);
  return res.json();
}

export async function createDbScript(input: CreateDbScriptInput): Promise<DbScript> {
  const res = await fetch(`${BASE_URL}/db-scripts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function updateDbScript(id: string, input: UpdateDbScriptInput): Promise<DbScript> {
  const res = await fetch(`${BASE_URL}/db-scripts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function deleteDbScript(id: string): Promise<void> {
  await fetch(`${BASE_URL}/db-scripts/${id}`, { method: "DELETE" });
}

export async function runDbScript(id: string, confirmed?: boolean): Promise<DbScriptRunResult> {
  const res = await fetch(`${BASE_URL}/db-scripts/${id}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmed }),
  });
  return res.json();
}

export async function getDbScriptHistory(id: string, limit = 10): Promise<DbScriptRunResult[]> {
  const res = await fetch(`${BASE_URL}/db-scripts/${id}/history?limit=${limit}`);
  return res.json();
}

// ---- Config export / import ----

export async function exportConfig(connectionIds?: string[], scriptIds?: string[]): Promise<void> {
  const res = await fetch(`${BASE_URL}/config/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionIds, scriptIds }),
  });
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? "tuldep-config.json";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function previewImportConfig(config: TuldepConfigExport): Promise<ImportPreviewItem[]> {
  const res = await fetch(`${BASE_URL}/config/import/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Preview failed (${res.status})`);
  }
  return res.json();
}

export async function applyImportConfig(
  config: TuldepConfigExport,
  resolutions: ImportResolution[],
): Promise<ImportApplySummary> {
  const res = await fetch(`${BASE_URL}/config/import/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config, resolutions }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Import failed (${res.status})`);
  }
  return res.json();
}

// ---- My IP (proxied through the server to avoid CORS and share its 60s cache) ----

export async function getMyIp(): Promise<MyIpInfo> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/my-ip`);
  } catch {
    throw new Error("Could not reach the Tuldep server.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `My IP lookup failed (${res.status})`);
  }
  return res.json();
}

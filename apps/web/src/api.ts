import type {
  CreateDbConnectionInput,
  CreateDbScriptInput,
  CreateProjectInput,
  DbConnection,
  DbScript,
  DbScriptRunResult,
  Project,
  ProjectStatus,
  ProjectWithStatus,
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

export async function startProject(id: string): Promise<{ status: ProjectStatus }> {
  const res = await fetch(`${BASE_URL}/projects/${id}/start`, { method: "POST" });
  return res.json();
}

export async function stopProject(id: string): Promise<{ status: ProjectStatus }> {
  const res = await fetch(`${BASE_URL}/projects/${id}/stop`, { method: "POST" });
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

export async function deleteDbConnection(id: string): Promise<void> {
  await fetch(`${BASE_URL}/db-connections/${id}`, { method: "DELETE" });
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

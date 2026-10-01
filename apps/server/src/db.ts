import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import type {
  CreateDbConnectionInput,
  CreateDbScriptInput,
  CreateProjectInput,
  DbConnection,
  DbScript,
  DbScriptRunResult,
  Project,
  ScanSettings,
  UpdateDbConnectionInput,
  UpdateDbScriptInput,
  UpdateProjectInput,
  UpdateScanSettingsInput,
} from "@tuldep/shared";
import { DEFAULT_EXCLUDE_PATTERNS } from "./projectScanner";

mkdirSync("data", { recursive: true });

export const db = new Database("data/tuldep.db", { create: true });
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;"); // required for ON DELETE CASCADE below to actually fire — off by default in SQLite

db.run(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cwd TEXT NOT NULL,
    command TEXT NOT NULL,
    env TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS db_connections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('postgres', 'mongodb')),
    connectionString TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS db_scripts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    connectionId TEXT NOT NULL REFERENCES db_connections(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('postgres', 'mongodb')),
    payload TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS script_runs (
    id TEXT PRIMARY KEY,
    scriptId TEXT NOT NULL REFERENCES db_scripts(id) ON DELETE CASCADE,
    success INTEGER NOT NULL,
    message TEXT NOT NULL,
    durationMs INTEGER NOT NULL,
    ranAt INTEGER NOT NULL
  )
`);
db.run("CREATE INDEX IF NOT EXISTS idx_script_runs_scriptId ON script_runs(scriptId)");

db.run(`
  CREATE TABLE IF NOT EXISTS scan_settings (
    id TEXT PRIMARY KEY,
    rootPath TEXT NOT NULL,
    maxDepth INTEGER NOT NULL,
    excludePatterns TEXT NOT NULL,
    updatedAt INTEGER NOT NULL
  )
`);

function ensureColumn(table: string, column: string, ddl: string): void {
  const columns = db.query<{ name: string }, []>(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === column)) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}
ensureColumn("db_connections", "createdAt", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("db_scripts", "createdAt", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("db_scripts", "kind", "TEXT NOT NULL DEFAULT 'postgres'");
ensureColumn("projects", "engine", "TEXT");
ensureColumn("projects", "port", "INTEGER");

function ensureColumnDropped(table: string, column: string): void {
  const columns = db.query<{ name: string }, []>(`PRAGMA table_info(${table})`).all();
  if (columns.some((c) => c.name === column)) {
    db.run(`ALTER TABLE ${table} DROP COLUMN ${column}`);
  }
}
// `action` was removed from the DbScript concept entirely — drop it from any db_scripts
// table created before this change. No data migration needed: nothing else derives from it.
ensureColumnDropped("db_scripts", "action");

interface ProjectRow {
  id: string;
  name: string;
  cwd: string;
  command: string;
  env: string;
  engine: string | null;
  port: number | null;
  createdAt: number;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    cwd: row.cwd,
    command: row.command,
    env: JSON.parse(row.env),
    engine: row.engine ? JSON.parse(row.engine) : null,
    port: row.port ?? null,
    createdAt: row.createdAt,
  };
}

export function getProjects(): Project[] {
  const rows = db.query<ProjectRow, []>("SELECT * FROM projects ORDER BY createdAt ASC").all();
  return rows.map(rowToProject);
}

export function getProject(id: string): Project | null {
  const row = db.query<ProjectRow, [string]>("SELECT * FROM projects WHERE id = ?").get(id);
  return row ? rowToProject(row) : null;
}

export function createProject(input: CreateProjectInput): Project {
  const project: Project = { id: crypto.randomUUID(), createdAt: Date.now(), engine: null, port: null, ...input };
  db.query(
    "INSERT INTO projects (id, name, cwd, command, env, engine, port, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    project.id,
    project.name,
    project.cwd,
    project.command,
    JSON.stringify(project.env),
    project.engine ? JSON.stringify(project.engine) : null,
    project.port ?? null,
    project.createdAt,
  );
  return project;
}

export function deleteProject(id: string): void {
  db.query("DELETE FROM projects WHERE id = ?").run(id);
}

export function deleteAllProjects(): void {
  db.query("DELETE FROM projects").run();
}

export function updateProject(id: string, patch: UpdateProjectInput): Project | null {
  const existing = getProject(id);
  if (!existing) return null;
  const updated: Project = { ...existing, ...patch };
  db.query("UPDATE projects SET name = ?, cwd = ?, command = ?, env = ?, engine = ?, port = ? WHERE id = ?").run(
    updated.name,
    updated.cwd,
    updated.command,
    JSON.stringify(updated.env),
    updated.engine ? JSON.stringify(updated.engine) : null,
    updated.port ?? null,
    id,
  );
  return updated;
}

export function importProjects(inputs: CreateProjectInput[]): Project[] {
  const insertAll = db.transaction((rows: CreateProjectInput[]) => rows.map((input) => createProject(input)));
  return insertAll(inputs);
}

// ---- DbConnection ----

export function getDbConnections(): DbConnection[] {
  return db.query<DbConnection, []>("SELECT * FROM db_connections ORDER BY createdAt ASC").all();
}

export function getDbConnection(id: string): DbConnection | null {
  return db.query<DbConnection, [string]>("SELECT * FROM db_connections WHERE id = ?").get(id);
}

export function createDbConnection(input: CreateDbConnectionInput): DbConnection {
  const connection: DbConnection = { id: crypto.randomUUID(), createdAt: Date.now(), ...input };
  db.query(
    "INSERT INTO db_connections (id, name, kind, connectionString, createdAt) VALUES (?, ?, ?, ?, ?)",
  ).run(connection.id, connection.name, connection.kind, connection.connectionString, connection.createdAt);
  return connection;
}

export function deleteDbConnection(id: string): void {
  db.query("DELETE FROM db_connections WHERE id = ?").run(id);
}

/** Scripts and their run history go too, via ON DELETE CASCADE. */
export function deleteAllDbConnections(): void {
  db.query("DELETE FROM db_connections").run();
}

export function updateDbConnection(id: string, patch: UpdateDbConnectionInput): DbConnection | null {
  const existing = getDbConnection(id);
  if (!existing) return null;
  const updated: DbConnection = { ...existing, ...patch };
  db.query("UPDATE db_connections SET name = ?, kind = ?, connectionString = ? WHERE id = ?").run(
    updated.name,
    updated.kind,
    updated.connectionString,
    id,
  );
  return updated;
}

// ---- DbScript ----

export function getDbScripts(): DbScript[] {
  return db.query<DbScript, []>("SELECT * FROM db_scripts ORDER BY createdAt ASC").all();
}

export function getDbScript(id: string): DbScript | null {
  return db.query<DbScript, [string]>("SELECT * FROM db_scripts WHERE id = ?").get(id);
}

export function createDbScript(input: CreateDbScriptInput): DbScript {
  const script: DbScript = { id: crypto.randomUUID(), createdAt: Date.now(), ...input };
  db.query(
    "INSERT INTO db_scripts (id, name, connectionId, kind, payload, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(script.id, script.name, script.connectionId, script.kind, script.payload, script.createdAt);
  return script;
}

export function deleteDbScript(id: string): void {
  db.query("DELETE FROM db_scripts WHERE id = ?").run(id);
}

export function updateDbScript(id: string, patch: UpdateDbScriptInput): DbScript | null {
  const existing = getDbScript(id);
  if (!existing) return null;
  const updated: DbScript = { ...existing, ...patch };
  db.query("UPDATE db_scripts SET name = ?, connectionId = ?, kind = ?, payload = ? WHERE id = ?").run(
    updated.name,
    updated.connectionId,
    updated.kind,
    updated.payload,
    id,
  );
  return updated;
}

// ---- script_runs ----

interface ScriptRunRow {
  id: string;
  scriptId: string;
  success: number;
  message: string;
  durationMs: number;
  ranAt: number;
}

function rowToScriptRun(row: ScriptRunRow): DbScriptRunResult {
  return {
    scriptId: row.scriptId,
    success: row.success === 1,
    message: row.message,
    durationMs: row.durationMs,
    ranAt: row.ranAt,
  };
}

export function recordScriptRun(result: DbScriptRunResult): void {
  db.query(
    "INSERT INTO script_runs (id, scriptId, success, message, durationMs, ranAt) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(crypto.randomUUID(), result.scriptId, result.success ? 1 : 0, result.message, result.durationMs, result.ranAt);
}

export function getScriptRunHistory(scriptId: string, limit: number = 10): DbScriptRunResult[] {
  const rows = db
    .query<ScriptRunRow, [string, number]>(
      "SELECT * FROM script_runs WHERE scriptId = ? ORDER BY ranAt DESC LIMIT ?",
    )
    .all(scriptId, limit);
  return rows.map(rowToScriptRun);
}

// ---- scan_settings (single row, fixed id 'default') ----

const SCAN_SETTINGS_ID = "default";

interface ScanSettingsRow {
  id: string;
  rootPath: string;
  maxDepth: number;
  excludePatterns: string;
  updatedAt: number;
}

function rowToScanSettings(row: ScanSettingsRow): ScanSettings {
  return { id: row.id, rootPath: row.rootPath, maxDepth: row.maxDepth, excludePatterns: JSON.parse(row.excludePatterns) };
}

export function getScanSettings(): ScanSettings {
  const row = db.query<ScanSettingsRow, [string]>("SELECT * FROM scan_settings WHERE id = ?").get(SCAN_SETTINGS_ID);
  if (!row) {
    return { id: SCAN_SETTINGS_ID, rootPath: "", maxDepth: 2, excludePatterns: DEFAULT_EXCLUDE_PATTERNS };
  }
  return rowToScanSettings(row);
}

export function saveScanSettings(input: UpdateScanSettingsInput): ScanSettings {
  const settings: ScanSettings = { id: SCAN_SETTINGS_ID, ...input };
  db.query(
    `INSERT INTO scan_settings (id, rootPath, maxDepth, excludePatterns, updatedAt) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET rootPath = excluded.rootPath, maxDepth = excluded.maxDepth,
       excludePatterns = excluded.excludePatterns, updatedAt = excluded.updatedAt`,
  ).run(settings.id, settings.rootPath, settings.maxDepth, JSON.stringify(settings.excludePatterns), Date.now());
  return settings;
}

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
} from "@tuldep/shared";

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
    action TEXT NOT NULL CHECK (action IN ('seed', 'reset', 'migrate', 'custom')),
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

function ensureColumn(table: string, column: string, ddl: string): void {
  const columns = db.query<{ name: string }, []>(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === column)) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}
ensureColumn("db_connections", "createdAt", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("db_scripts", "createdAt", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("db_scripts", "kind", "TEXT NOT NULL DEFAULT 'postgres'");

interface ProjectRow {
  id: string;
  name: string;
  cwd: string;
  command: string;
  env: string;
  createdAt: number;
}

function rowToProject(row: ProjectRow): Project {
  return { ...row, env: JSON.parse(row.env) };
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
  const project: Project = { id: crypto.randomUUID(), createdAt: Date.now(), ...input };
  db.query(
    "INSERT INTO projects (id, name, cwd, command, env, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(project.id, project.name, project.cwd, project.command, JSON.stringify(project.env), project.createdAt);
  return project;
}

export function deleteProject(id: string): void {
  db.query("DELETE FROM projects WHERE id = ?").run(id);
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
    "INSERT INTO db_scripts (id, name, connectionId, action, kind, payload, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(script.id, script.name, script.connectionId, script.action, script.kind, script.payload, script.createdAt);
  return script;
}

export function deleteDbScript(id: string): void {
  db.query("DELETE FROM db_scripts WHERE id = ?").run(id);
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

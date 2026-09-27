import type { ImportApplySummary, ImportItemType, ImportPreviewItem, ImportResolution, TuldepConfigExport } from "@tuldep/shared";
import * as db from "./db";

export function validateImport(config: TuldepConfigExport): ImportPreviewItem[] {
  const existingConnectionNames = new Set(db.getDbConnections().map((c) => c.name));
  const existingScriptNames = new Set(db.getDbScripts().map((s) => s.name));

  const items: ImportPreviewItem[] = [];

  for (const conn of config.connections) {
    items.push({
      type: "connection",
      name: conn.name,
      status: existingConnectionNames.has(conn.name) ? "conflict" : "new",
    });
  }

  for (const script of config.scripts) {
    items.push({
      type: "script",
      name: script.name,
      status: existingScriptNames.has(script.name) ? "conflict" : "new",
      detail: `connection: ${script.connectionName}`,
    });
  }

  return items;
}

// Deliberately NOT wrapped in a single db.transaction — a script whose referenced
// connection is missing should be skipped-with-warning, not abort the whole import.
export function applyImport(config: TuldepConfigExport, resolutions: ImportResolution[]): ImportApplySummary {
  let imported = 0;
  let skipped = 0;
  const warnings: string[] = [];

  function resolutionFor(type: ImportItemType, name: string): ImportResolution | undefined {
    return resolutions.find((r) => r.type === type && r.name === name);
  }

  // connectionName (as it appears in the file) -> local connection id, seeded with
  // whatever already exists locally, then updated as each file connection is processed.
  const connectionNameToId = new Map(db.getDbConnections().map((c) => [c.name, c.id]));
  const existingConnectionsByName = new Map(db.getDbConnections().map((c) => [c.name, c]));

  for (const conn of config.connections) {
    const existing = existingConnectionsByName.get(conn.name);

    if (!existing) {
      const created = db.createDbConnection({ name: conn.name, kind: conn.kind, connectionString: conn.connectionString });
      connectionNameToId.set(conn.name, created.id);
      imported++;
      continue;
    }

    const resolution = resolutionFor("connection", conn.name);
    const action = resolution?.action ?? "skip";

    if (action === "skip") {
      skipped++;
    } else if (action === "overwrite") {
      db.updateDbConnection(existing.id, { kind: conn.kind, connectionString: conn.connectionString });
      connectionNameToId.set(conn.name, existing.id);
      imported++;
    } else {
      const newName = resolution?.newName?.trim();
      if (!newName) {
        warnings.push(`Connection "${conn.name}": rename selected but no new name was provided — skipped`);
        skipped++;
      } else {
        const created = db.createDbConnection({ name: newName, kind: conn.kind, connectionString: conn.connectionString });
        connectionNameToId.set(conn.name, created.id);
        imported++;
      }
    }
  }

  const existingScriptsByName = new Map(db.getDbScripts().map((s) => [s.name, s]));

  for (const script of config.scripts) {
    const connectionId = connectionNameToId.get(script.connectionName);
    if (!connectionId) {
      warnings.push(`Script "${script.name}": referenced connection "${script.connectionName}" was not found — skipped`);
      skipped++;
      continue;
    }

    const existing = existingScriptsByName.get(script.name);

    if (!existing) {
      db.createDbScript({ name: script.name, connectionId, kind: script.kind, payload: script.payload });
      imported++;
      continue;
    }

    const resolution = resolutionFor("script", script.name);
    const action = resolution?.action ?? "skip";

    if (action === "skip") {
      skipped++;
    } else if (action === "overwrite") {
      db.updateDbScript(existing.id, { connectionId, kind: script.kind, payload: script.payload });
      imported++;
    } else {
      const newName = resolution?.newName?.trim();
      if (!newName) {
        warnings.push(`Script "${script.name}": rename selected but no new name was provided — skipped`);
        skipped++;
      } else {
        db.createDbScript({ name: newName, connectionId, kind: script.kind, payload: script.payload });
        imported++;
      }
    }
  }

  return { imported, skipped, warnings };
}

import { CONFIG_EXPORT_VERSION } from "@tuldep/shared";
import type { TuldepConfigExport } from "@tuldep/shared";
import * as db from "./db";

export function exportConfig(connectionIds?: string[], scriptIds?: string[]): TuldepConfigExport {
  const allConnections = db.getDbConnections();
  const allScripts = db.getDbScripts();

  const scripts = scriptIds === undefined ? allScripts : allScripts.filter((s) => scriptIds.includes(s.id));

  const includedConnectionIds = new Set(connectionIds === undefined ? allConnections.map((c) => c.id) : connectionIds);
  // Always include whatever connections the selected scripts reference, even if the
  // user didn't explicitly check them, so the exported file stays self-contained.
  for (const script of scripts) includedConnectionIds.add(script.connectionId);

  const connections = allConnections.filter((c) => includedConnectionIds.has(c.id));
  const connectionById = new Map(allConnections.map((c) => [c.id, c]));

  return {
    version: CONFIG_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    connections: connections.map((c) => ({ name: c.name, kind: c.kind, connectionString: c.connectionString })),
    scripts: scripts.map((s) => ({
      name: s.name,
      connectionName: connectionById.get(s.connectionId)?.name ?? "",
      kind: s.kind,
      payload: s.payload,
    })),
  };
}

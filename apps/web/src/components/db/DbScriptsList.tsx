import type { DbConnection, DbScript, DbScriptRunResult } from "@tuldep/shared";
import { DbScriptRow } from "./DbScriptRow";
import { EmptyState } from "../Mascot";

interface DbScriptsListProps {
  connections: DbConnection[];
  scripts: DbScript[];
  lastResults: Record<string, DbScriptRunResult>;
  history: Record<string, DbScriptRunResult[]>;
  runningIds: Set<string>;
  onRun: (id: string, confirmed?: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DbScriptsList({
  connections,
  scripts,
  lastResults,
  history,
  runningIds,
  onRun,
  onEdit,
  onDelete,
}: DbScriptsListProps) {
  if (scripts.length === 0) {
    return <EmptyState>No scripts yet — add one above!</EmptyState>;
  }

  return (
    <div>
      {connections.map((connection) => {
        const connectionScripts = scripts.filter((s) => s.connectionId === connection.id);
        if (connectionScripts.length === 0) return null;
        return (
          <div key={connection.id} className="db-script-group">
            <h3>{connection.name}</h3>
            <div className="project-grid">
              {connectionScripts.map((script) => (
                <DbScriptRow
                  key={script.id}
                  script={script}
                  connectionName={connection.name}
                  lastResult={lastResults[script.id]}
                  history={history[script.id] ?? []}
                  running={runningIds.has(script.id)}
                  onRun={onRun}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

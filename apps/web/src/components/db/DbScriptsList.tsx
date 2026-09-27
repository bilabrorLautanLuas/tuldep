import type { DbConnection, DbScript, DbScriptRunResult } from "@tuldep/shared";
import { DbScriptRow } from "./DbScriptRow";

interface DbScriptsListProps {
  connections: DbConnection[];
  scripts: DbScript[];
  lastResults: Record<string, DbScriptRunResult>;
  history: Record<string, DbScriptRunResult[]>;
  onRun: (id: string, confirmed?: boolean) => void;
  onDelete: (id: string) => void;
}

export function DbScriptsList({ connections, scripts, lastResults, history, onRun, onDelete }: DbScriptsListProps) {
  if (scripts.length === 0) {
    return <p className="empty-state">No scripts yet — add one above.</p>;
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
                  onRun={onRun}
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

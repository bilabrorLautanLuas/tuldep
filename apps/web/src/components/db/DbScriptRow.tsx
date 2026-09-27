import { isDestructiveAction } from "@tuldep/shared";
import type { DbScript, DbScriptRunResult } from "@tuldep/shared";

interface DbScriptRowProps {
  script: DbScript;
  connectionName: string;
  lastResult?: DbScriptRunResult;
  history: DbScriptRunResult[];
  onRun: (id: string, confirmed?: boolean) => void;
  onDelete: (id: string) => void;
}

export function DbScriptRow({ script, connectionName, lastResult, history, onRun, onDelete }: DbScriptRowProps) {
  function handleRun() {
    if (isDestructiveAction(script.action)) {
      const confirmed = window.confirm(
        `Yakin mau jalankan ${script.action} di ${connectionName}? Ini destructive.`,
      );
      if (!confirmed) return;
      onRun(script.id, true);
    } else {
      onRun(script.id);
    }
  }

  return (
    <div className="project-card">
      <div className="project-card-title">
        <span className={`action-badge action-badge--${script.action}`}>{script.action}</span>
        <span className="project-name">{script.name}</span>
      </div>
      <div className="project-meta project-command">{script.payload}</div>

      <div className="project-card-actions">
        <button onClick={handleRun}>Run</button>
        <button className="danger" onClick={() => onDelete(script.id)}>
          Delete
        </button>
      </div>

      {lastResult && (
        <div className={`script-run-result script-run-result--${lastResult.success ? "success" : "error"}`}>
          {lastResult.message}
        </div>
      )}

      {history.length > 0 && (
        <ul className="script-run-history">
          {history.slice(0, 5).map((run, i) => (
            <li key={i}>
              <span>{new Date(run.ranAt).toLocaleTimeString()}</span>
              <span>{run.success ? "success" : "error"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

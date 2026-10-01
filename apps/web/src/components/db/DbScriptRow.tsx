import type { DbScript, DbScriptRunResult } from "@tuldep/shared";
import { EditIcon, PlayIcon, TrashIcon } from "../Icons";

interface DbScriptRowProps {
  script: DbScript;
  connectionName: string;
  lastResult?: DbScriptRunResult;
  history: DbScriptRunResult[];
  running?: boolean;
  onRun: (id: string, confirmed?: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DbScriptRow({
  script,
  connectionName,
  lastResult,
  history,
  running,
  onRun,
  onEdit,
  onDelete,
}: DbScriptRowProps) {
  function handleRun() {
    const confirmed = window.confirm(`Yakin mau jalankan script "${script.name}" di ${connectionName}?`);
    if (!confirmed) return;
    onRun(script.id, true);
  }

  return (
    <div className="project-card db-script-row">
      <div className="project-card-title">
        <span className={`kind-badge kind-badge--${script.kind}`}>{script.kind}</span>
        <span className="project-name">{script.name}</span>
      </div>

      <div className="project-card-actions project-card-actions--icons">
        <button
          className="primary icon-btn"
          title="Run"
          aria-label="Run script"
          onClick={handleRun}
          disabled={running}
        >
          {running ? <span className="spinner" /> : <PlayIcon />}
        </button>
        <button className="icon-btn" title="Edit" aria-label="Edit script" onClick={() => onEdit(script.id)}>
          <EditIcon />
        </button>
        <button
          className="danger icon-btn"
          title="Delete"
          aria-label="Delete script"
          onClick={() => onDelete(script.id)}
        >
          <TrashIcon />
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

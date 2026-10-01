import { useState } from "react";
import type { DbConnection } from "@tuldep/shared";
import { EmptyState } from "../Mascot";
import { EyeButton } from "../EyeButton";

interface DbConnectionsListProps {
  connections: DbConnection[];
  testResults: Record<string, { ok: boolean; error?: string }>;
  onTest: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DbConnectionsList({ connections, testResults, onTest, onEdit, onDelete }: DbConnectionsListProps) {
  // Per-item reveal state; everything starts hidden.
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  function toggleReveal(id: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  if (connections.length === 0) {
    return <EmptyState>No connections yet — add one above!</EmptyState>;
  }

  return (
    <div className="project-grid">
      {connections.map((connection) => {
        const result = testResults[connection.id];
        const revealed = revealedIds.has(connection.id);
        return (
          <div key={connection.id} className="project-card">
            <div className="project-card-title">
              <span className={`kind-badge kind-badge--${connection.kind}`}>{connection.kind}</span>
              <span className="project-name">{connection.name}</span>
            </div>
            <div className="secret-row">
              <span className="project-meta project-command">{revealed ? connection.connectionString : "***"}</span>
              <EyeButton shown={revealed} onToggle={() => toggleReveal(connection.id)} />
            </div>
            {result && (
              <div className={`script-run-result script-run-result--${result.ok ? "success" : "error"}`}>
                {result.ok ? "OK" : (result.error ?? "failed")}
              </div>
            )}
            <div className="project-card-actions">
              <button onClick={() => onTest(connection.id)}>Test Connection</button>
              <button onClick={() => onEdit(connection.id)} title="Edit connection">
                ✎ Edit
              </button>
              <button className="danger" onClick={() => onDelete(connection.id)}>
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

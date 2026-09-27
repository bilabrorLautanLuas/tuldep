import type { DbConnection } from "@tuldep/shared";

interface DbConnectionsListProps {
  connections: DbConnection[];
  testResults: Record<string, { ok: boolean; error?: string }>;
  onTest: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DbConnectionsList({ connections, testResults, onTest, onDelete }: DbConnectionsListProps) {
  if (connections.length === 0) {
    return <p className="empty-state">No connections yet — add one above.</p>;
  }

  return (
    <div className="project-grid">
      {connections.map((connection) => {
        const result = testResults[connection.id];
        return (
          <div key={connection.id} className="project-card">
            <div className="project-card-title">
              <span className={`kind-badge kind-badge--${connection.kind}`}>{connection.kind}</span>
              <span className="project-name">{connection.name}</span>
            </div>
            <div className="project-meta project-command">{connection.connectionString}</div>
            {result && (
              <div className={`script-run-result script-run-result--${result.ok ? "success" : "error"}`}>
                {result.ok ? "OK" : (result.error ?? "failed")}
              </div>
            )}
            <div className="project-card-actions">
              <button onClick={() => onTest(connection.id)}>Test Connection</button>
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

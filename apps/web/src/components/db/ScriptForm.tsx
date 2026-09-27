import { useState } from "react";
import type { CreateDbScriptInput, DbConnection, DbScript } from "@tuldep/shared";

interface ScriptFormProps {
  mode: "create" | "edit";
  connections: DbConnection[];
  initialScript?: DbScript;
  onSubmit: (input: CreateDbScriptInput) => Promise<void>;
  onCancel?: () => void;
}

const POSTGRES_PLACEHOLDER = "TRUNCATE TABLE your_table;";
const MONGO_PLACEHOLDER = '{"collection": "users", "operation": "deleteMany", "data": {}}';

export function ScriptForm({ mode, connections, initialScript, onSubmit, onCancel }: ScriptFormProps) {
  const [name, setName] = useState(initialScript?.name ?? "");
  const [connectionId, setConnectionId] = useState(initialScript?.connectionId ?? connections[0]?.id ?? "");
  const [payload, setPayload] = useState(initialScript?.payload ?? "");
  const [submitting, setSubmitting] = useState(false);

  const selectedConnection = connections.find((c) => c.id === connectionId) ?? connections[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !selectedConnection || !payload) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        connectionId: selectedConnection.id,
        kind: selectedConnection.kind,
        payload,
      });
      if (mode === "create") {
        setName("");
        setPayload("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (connections.length === 0) {
    return <p className="empty-state">Add a connection first before creating scripts.</p>;
  }

  return (
    <form className="add-project-form" onSubmit={handleSubmit}>
      <h2>{mode === "create" ? "Add Script" : "Edit Script"}</h2>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <select value={connectionId || selectedConnection?.id} onChange={(e) => setConnectionId(e.target.value)}>
        {connections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.kind})
          </option>
        ))}
      </select>
      <textarea
        placeholder={selectedConnection?.kind === "mongodb" ? MONGO_PLACEHOLDER : POSTGRES_PLACEHOLDER}
        value={payload}
        onChange={(e) => setPayload(e.target.value)}
        rows={4}
        className="script-payload-input"
      />
      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {mode === "create" ? "Add Script" : "Save Changes"}
        </button>
        {mode === "edit" && onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

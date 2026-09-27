import { useState } from "react";
import type { DbConnection, DbScriptAction } from "@tuldep/shared";
import * as api from "../../api";

interface AddScriptFormProps {
  connections: DbConnection[];
  onAdded: () => void;
}

const POSTGRES_PLACEHOLDER = "TRUNCATE TABLE your_table;";
const MONGO_PLACEHOLDER = '{"collection": "users", "operation": "deleteMany", "data": {}}';

export function AddScriptForm({ connections, onAdded }: AddScriptFormProps) {
  const [name, setName] = useState("");
  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? "");
  const [action, setAction] = useState<DbScriptAction>("seed");
  const [payload, setPayload] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedConnection = connections.find((c) => c.id === connectionId) ?? connections[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !selectedConnection || !payload) return;
    setSubmitting(true);
    try {
      await api.createDbScript({
        name,
        connectionId: selectedConnection.id,
        action,
        kind: selectedConnection.kind,
        payload,
      });
      setName("");
      setPayload("");
      onAdded();
    } finally {
      setSubmitting(false);
    }
  }

  if (connections.length === 0) {
    return <p className="empty-state">Add a connection first before creating scripts.</p>;
  }

  return (
    <form className="add-project-form" onSubmit={handleSubmit}>
      <h2>Add Script</h2>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <select value={connectionId || selectedConnection?.id} onChange={(e) => setConnectionId(e.target.value)}>
        {connections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.kind})
          </option>
        ))}
      </select>
      <select value={action} onChange={(e) => setAction(e.target.value as DbScriptAction)}>
        <option value="seed">seed</option>
        <option value="reset">reset</option>
        <option value="migrate">migrate</option>
        <option value="custom">custom</option>
      </select>
      <textarea
        placeholder={selectedConnection?.kind === "mongodb" ? MONGO_PLACEHOLDER : POSTGRES_PLACEHOLDER}
        value={payload}
        onChange={(e) => setPayload(e.target.value)}
        rows={4}
        className="script-payload-input"
      />
      <button type="submit" disabled={submitting}>
        Add Script
      </button>
    </form>
  );
}

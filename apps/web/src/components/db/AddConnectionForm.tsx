import { useState } from "react";
import type { DbConnectionKind } from "@tuldep/shared";
import * as api from "../../api";

interface AddConnectionFormProps {
  onAdded: () => void;
}

export function AddConnectionForm({ onAdded }: AddConnectionFormProps) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<DbConnectionKind>("postgres");
  const [connectionString, setConnectionString] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !connectionString) return;
    setSubmitting(true);
    try {
      await api.createDbConnection({ name, kind, connectionString });
      setName("");
      setConnectionString("");
      onAdded();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="add-project-form" onSubmit={handleSubmit}>
      <h2>Add Connection</h2>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <select value={kind} onChange={(e) => setKind(e.target.value as DbConnectionKind)}>
        <option value="postgres">postgres</option>
        <option value="mongodb">mongodb</option>
      </select>
      <input
        placeholder="Connection string"
        value={connectionString}
        onChange={(e) => setConnectionString(e.target.value)}
      />
      <button type="submit" disabled={submitting}>
        Add Connection
      </button>
    </form>
  );
}

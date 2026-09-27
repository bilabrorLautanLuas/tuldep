import { useState } from "react";
import type { CreateDbConnectionInput, DbConnection, DbConnectionKind } from "@tuldep/shared";

interface ConnectionFormProps {
  mode: "create" | "edit";
  initialConnection?: DbConnection;
  onSubmit: (input: CreateDbConnectionInput) => Promise<void>;
  onCancel?: () => void;
}

export function ConnectionForm({ mode, initialConnection, onSubmit, onCancel }: ConnectionFormProps) {
  const [name, setName] = useState(initialConnection?.name ?? "");
  const [kind, setKind] = useState<DbConnectionKind>(initialConnection?.kind ?? "postgres");
  const [connectionString, setConnectionString] = useState(initialConnection?.connectionString ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !connectionString) return;
    setSubmitting(true);
    try {
      await onSubmit({ name, kind, connectionString });
      if (mode === "create") {
        setName("");
        setConnectionString("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="add-project-form" onSubmit={handleSubmit}>
      <h2>{mode === "create" ? "Add Connection" : "Edit Connection"}</h2>
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
      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {mode === "create" ? "Add Connection" : "Save Changes"}
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

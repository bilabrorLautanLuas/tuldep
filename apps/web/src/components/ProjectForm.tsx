import { useState } from "react";
import type { CreateProjectInput, Project } from "@tuldep/shared";

interface EnvRow {
  key: string;
  value: string;
}

interface ProjectFormProps {
  mode: "create" | "edit";
  initialProject?: Project;
  onSubmit: (input: CreateProjectInput) => Promise<void>;
  onCancel?: () => void;
}

export function ProjectForm({ mode, initialProject, onSubmit, onCancel }: ProjectFormProps) {
  const [name, setName] = useState(initialProject?.name ?? "");
  const [cwd, setCwd] = useState(initialProject?.cwd ?? "");
  const [command, setCommand] = useState(initialProject?.command ?? "");
  const [envRows, setEnvRows] = useState<EnvRow[]>(
    initialProject ? Object.entries(initialProject.env).map(([key, value]) => ({ key, value })) : [],
  );
  const [submitting, setSubmitting] = useState(false);

  function updateRow(index: number, field: "key" | "value", value: string) {
    setEnvRows((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setEnvRows((rows) => [...rows, { key: "", value: "" }]);
  }

  function removeRow(index: number) {
    setEnvRows((rows) => rows.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !cwd || !command) return;
    setSubmitting(true);
    try {
      const env = Object.fromEntries(
        envRows.filter((row) => row.key.trim().length > 0).map((row) => [row.key.trim(), row.value]),
      );
      await onSubmit({ name, cwd, command, env });
      if (mode === "create") {
        setName("");
        setCwd("");
        setCommand("");
        setEnvRows([]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="add-project-form" onSubmit={handleSubmit}>
      <h2>{mode === "create" ? "Add Project" : "Edit Project"}</h2>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input placeholder="Working directory" value={cwd} onChange={(e) => setCwd(e.target.value)} />
      <input placeholder="Command" value={command} onChange={(e) => setCommand(e.target.value)} />

      <div className="env-editor">
        {envRows.map((row, i) => (
          <div key={i} className="env-row">
            <input
              placeholder="KEY"
              value={row.key}
              onChange={(e) => updateRow(i, "key", e.target.value)}
            />
            <input
              placeholder="value"
              value={row.value}
              onChange={(e) => updateRow(i, "value", e.target.value)}
            />
            <button type="button" className="danger" onClick={() => removeRow(i)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={addRow}>
          + Add env var
        </button>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {mode === "create" ? "Add Project" : "Save Changes"}
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

import { useEffect, useState } from "react";
import type { AvailableScript, CreateProjectInput, PackageManager, Project } from "@tuldep/shared";
import * as api from "../api";

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

const CUSTOM = "__custom__";

export function ProjectForm({ mode, initialProject, onSubmit, onCancel }: ProjectFormProps) {
  const [name, setName] = useState(initialProject?.name ?? "");
  const [cwd, setCwd] = useState(initialProject?.cwd ?? "");
  const [command, setCommand] = useState(initialProject?.command ?? "");
  const [envRows, setEnvRows] = useState<EnvRow[]>(
    initialProject ? Object.entries(initialProject.env).map(([key, value]) => ({ key, value })) : [],
  );
  const [submitting, setSubmitting] = useState(false);

  const [availableScripts, setAvailableScripts] = useState<AvailableScript[]>([]);
  const [packageManager, setPackageManager] = useState<PackageManager | null>(null);
  const [scriptsMessage, setScriptsMessage] = useState<string | undefined>(undefined);
  const [scriptsLoading, setScriptsLoading] = useState(false);
  const [selectedScript, setSelectedScript] = useState<string>(CUSTOM);

  // Debounced fetch of package.json scripts whenever cwd settles — same endpoint
  // for create and edit, so editing cwd always reflects the currently-typed path
  // rather than whatever cwd the project was originally saved with.
  useEffect(() => {
    if (!cwd.trim()) {
      setAvailableScripts([]);
      setPackageManager(null);
      setScriptsMessage(undefined);
      setScriptsLoading(false);
      return;
    }
    setScriptsLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const result = await api.getScriptsPreview(cwd);
        setAvailableScripts(result.scripts);
        setPackageManager(result.packageManager);
        setScriptsMessage(result.message);

        if (result.scripts.length > 0) {
          const prefix = result.packageManager === "bun" ? "bun run" : "npm run";
          const match = result.scripts.find((s) => `${prefix} ${s.name}` === command);
          setSelectedScript(match ? match.name : CUSTOM);
        } else {
          setSelectedScript(CUSTOM);
        }
      } catch {
        setAvailableScripts([]);
        setPackageManager(null);
        setScriptsMessage("Failed to check package.json");
        setSelectedScript(CUSTOM);
      } finally {
        setScriptsLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cwd]);

  function selectScript(script: AvailableScript) {
    const prefix = packageManager === "bun" ? "bun run" : "npm run";
    setSelectedScript(script.name);
    setCommand(`${prefix} ${script.name}`);
  }

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
        setSelectedScript(CUSTOM);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const showCommandInput = selectedScript === CUSTOM || availableScripts.length === 0;

  return (
    <form className="add-project-form" onSubmit={handleSubmit}>
      <h2>{mode === "create" ? "Add Project" : "Edit Project"}</h2>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input placeholder="Working directory" value={cwd} onChange={(e) => setCwd(e.target.value)} />

      <div className="script-picker">
        {scriptsLoading && <span className="script-picker-status">Checking package.json…</span>}

        {!scriptsLoading && availableScripts.length > 0 && (
          <div className="script-picker-options">
            {availableScripts.map((script) => (
              <label key={script.name} className="script-picker-option">
                <input
                  type="radio"
                  checked={selectedScript === script.name}
                  onChange={() => selectScript(script)}
                />
                <span>
                  <strong>{script.name}</strong> → {script.command}
                </span>
              </label>
            ))}
            <label className="script-picker-option">
              <input type="radio" checked={selectedScript === CUSTOM} onChange={() => setSelectedScript(CUSTOM)} />
              <span>Custom command</span>
            </label>
          </div>
        )}

        {!scriptsLoading && availableScripts.length === 0 && cwd.trim() && scriptsMessage && (
          <span className="script-picker-status">{scriptsMessage}</span>
        )}
      </div>

      {showCommandInput && (
        <input placeholder="Command" value={command} onChange={(e) => setCommand(e.target.value)} />
      )}

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

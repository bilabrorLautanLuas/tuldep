import { useEffect, useState } from "react";
import type { AvailableScript, CreateProjectInput, DetectedEngine, EngineType, PackageManager, Project } from "@tuldep/shared";
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

type EngineChoice = "none" | EngineType;

interface EngineVerifyState {
  status: "idle" | "checking" | "valid" | "invalid";
  version?: string;
  error?: string;
}

const ENGINE_LABEL: Record<EngineType, string> = { node: "Node.js", php: "PHP" };

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

  const [engineType, setEngineType] = useState<EngineChoice>(initialProject?.engine?.type ?? "none");
  const [detectedEngines, setDetectedEngines] = useState<DetectedEngine[]>([]);
  const [enginesLoading, setEnginesLoading] = useState(false);
  const [selectedEnginePath, setSelectedEnginePath] = useState<string>(
    initialProject?.engine ? initialProject.engine.path : CUSTOM,
  );
  const [customEnginePath, setCustomEnginePath] = useState<string>(initialProject?.engine?.path ?? "");
  const [engineVerify, setEngineVerify] = useState<EngineVerifyState>({ status: "idle" });
  const [port, setPort] = useState<string>(initialProject?.port != null ? String(initialProject.port) : "");

  // Fetch detected engines whenever the engine type changes, and reconcile the initially-saved
  // engine path against the freshly detected list (falls back to "Custom path" if it's not among them).
  useEffect(() => {
    if (engineType === "none") {
      setDetectedEngines([]);
      return;
    }
    setEnginesLoading(true);
    api
      .detectEngines(engineType)
      .then((engines) => {
        setDetectedEngines(engines);
        if (initialProject?.engine?.type === engineType) {
          const match = engines.find((e) => e.path === initialProject.engine!.path);
          setSelectedEnginePath(match ? match.path : CUSTOM);
          if (!match) setCustomEnginePath(initialProject.engine!.path);
        }
      })
      .catch(() => setDetectedEngines([]))
      .finally(() => setEnginesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineType]);

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
          const prefix = result.packageManager === "bun" ? "bun run" : "yarn run";
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
    const prefix = packageManager === "bun" ? "bun run" : "yarn run";
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

  function changeEngineType(value: EngineChoice) {
    setEngineType(value);
    setSelectedEnginePath(CUSTOM);
    setCustomEnginePath("");
    setEngineVerify({ status: "idle" });
  }

  async function handleVerifyCustomPath() {
    if (engineType === "none" || !customEnginePath.trim()) return;
    setEngineVerify({ status: "checking" });
    try {
      const result = await api.verifyEngine(customEnginePath.trim(), engineType);
      setEngineVerify(
        result.valid
          ? { status: "valid", version: result.version }
          : { status: "invalid", error: result.error ?? "Path is not valid" },
      );
    } catch {
      setEngineVerify({ status: "invalid", error: "Verify request failed" });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !cwd || !command) return;
    setSubmitting(true);
    try {
      const env = Object.fromEntries(
        envRows.filter((row) => row.key.trim().length > 0).map((row) => [row.key.trim(), row.value]),
      );

      let engine: CreateProjectInput["engine"] = null;
      if (engineType !== "none") {
        if (selectedEnginePath === CUSTOM) {
          if (customEnginePath.trim()) {
            engine = {
              type: engineType,
              path: customEnginePath.trim(),
              version: engineVerify.status === "valid" ? engineVerify.version ?? "" : "",
            };
          }
        } else {
          const match = detectedEngines.find((e) => e.path === selectedEnginePath);
          if (match) engine = { type: engineType, path: match.path, version: match.version };
        }
      }

      const trimmedPort = port.trim();
      const parsedPort = trimmedPort ? Number(trimmedPort) : null;

      await onSubmit({ name, cwd, command, env, engine, port: parsedPort });
      if (mode === "create") {
        setName("");
        setCwd("");
        setCommand("");
        setEnvRows([]);
        setSelectedScript(CUSTOM);
        changeEngineType("none");
        setPort("");
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

      <input
        type="number"
        min={1}
        max={65535}
        placeholder="Port (optional, e.g. 3000)"
        value={port}
        onChange={(e) => setPort(e.target.value)}
      />

      <div className="engine-picker">
        <label className="engine-type-row">
          <span>Engine</span>
          <select value={engineType} onChange={(e) => changeEngineType(e.target.value as EngineChoice)}>
            <option value="none">None (use system PATH)</option>
            <option value="node">Node.js</option>
            <option value="php">PHP</option>
          </select>
        </label>

        {engineType !== "none" && (
          <div className="engine-options">
            {enginesLoading && (
              <span className="script-picker-status">Detecting {ENGINE_LABEL[engineType]} versions…</span>
            )}

            {!enginesLoading && detectedEngines.length === 0 && (
              <span className="script-picker-status">
                Tidak ada versi {ENGINE_LABEL[engineType]} terdeteksi, gunakan custom path.
              </span>
            )}

            {!enginesLoading && detectedEngines.length > 0 && (
              <div className="script-picker-options">
                {detectedEngines.map((engine) => (
                  <label key={engine.path} className="script-picker-option">
                    <input
                      type="radio"
                      checked={selectedEnginePath === engine.path}
                      onChange={() => setSelectedEnginePath(engine.path)}
                    />
                    <span>
                      <strong>v{engine.version}</strong> ({engine.source}) — {engine.path}
                    </span>
                  </label>
                ))}
                <label className="script-picker-option">
                  <input
                    type="radio"
                    checked={selectedEnginePath === CUSTOM}
                    onChange={() => setSelectedEnginePath(CUSTOM)}
                  />
                  <span>Custom path...</span>
                </label>
              </div>
            )}

            {!enginesLoading && (detectedEngines.length === 0 || selectedEnginePath === CUSTOM) && (
              <div className="engine-custom-path">
                <input
                  placeholder={engineType === "node" ? "/path/to/node" : "/path/to/php"}
                  value={customEnginePath}
                  onChange={(e) => {
                    setCustomEnginePath(e.target.value);
                    setEngineVerify({ status: "idle" });
                  }}
                />
                <button
                  type="button"
                  onClick={handleVerifyCustomPath}
                  disabled={engineVerify.status === "checking" || !customEnginePath.trim()}
                >
                  {engineVerify.status === "checking" ? "Verifying…" : "Verify"}
                </button>
              </div>
            )}

            {engineVerify.status === "valid" && (
              <span className="engine-verify-ok">✓ valid, v{engineVerify.version}</span>
            )}
            {engineVerify.status === "invalid" && <span className="engine-verify-fail">✗ {engineVerify.error}</span>}
          </div>
        )}
      </div>

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

import { useState } from "react";
import type { ImportApplySummary, ImportItemType, ImportPreviewItem, TuldepConfigExport } from "@tuldep/shared";
import * as api from "../../api";
import { Modal } from "../Modal";

interface ImportConfigModalProps {
  onClose: () => void;
  onImported: () => void;
}

type ResolutionAction = "skip" | "overwrite" | "rename";
interface ResolutionState {
  action: ResolutionAction;
  newName: string;
}

function keyFor(type: ImportItemType, name: string): string {
  return `${type}:${name}`;
}

export function ImportConfigModal({ onClose, onImported }: ImportConfigModalProps) {
  const [config, setConfig] = useState<TuldepConfigExport | null>(null);
  const [preview, setPreview] = useState<ImportPreviewItem[] | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, ResolutionState>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ImportApplySummary | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSummary(null);
    setConfig(null);
    setPreview(null);

    let parsed: unknown;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch {
      setError("File is not valid JSON");
      return;
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as Record<string, unknown>).connections) ||
      !Array.isArray((parsed as Record<string, unknown>).scripts)
    ) {
      setError("This doesn't look like a Tuldep config file (missing connections/scripts array)");
      return;
    }

    const typedConfig = parsed as TuldepConfigExport;
    setLoading(true);
    try {
      const items = await api.previewImportConfig(typedConfig);
      setConfig(typedConfig);
      setPreview(items);
      const initial: Record<string, ResolutionState> = {};
      for (const item of items) {
        if (item.status === "conflict") {
          initial[keyFor(item.type, item.name)] = { action: "skip", newName: "" };
        }
      }
      setResolutions(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview this file");
    } finally {
      setLoading(false);
    }
  }

  function updateResolution(type: ImportItemType, name: string, patch: Partial<ResolutionState>) {
    const key = keyFor(type, name);
    setResolutions((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { action: "skip", newName: "" }), ...patch },
    }));
  }

  async function handleConfirm() {
    if (!config || !preview) return;
    setLoading(true);
    setError(null);
    try {
      const resolutionList = preview
        .filter((item) => item.status === "conflict")
        .map((item) => {
          const r = resolutions[keyFor(item.type, item.name)] ?? { action: "skip" as const, newName: "" };
          return {
            type: item.type,
            name: item.name,
            action: r.action,
            newName: r.action === "rename" ? r.newName : undefined,
          };
        });
      const result = await api.applyImportConfig(config, resolutionList);
      setSummary(result);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Import Config" onClose={onClose}>
      {!preview && (
        <>
          <input type="file" accept=".json" onChange={handleFileSelected} disabled={loading} />
          {loading && <p className="script-picker-status">Reading file…</p>}
        </>
      )}

      {error && <div className="script-run-result script-run-result--error">{error}</div>}

      {preview && !summary && (
        <>
          <div className="config-preview-list">
            {preview.map((item) => {
              const key = keyFor(item.type, item.name);
              const resolution = resolutions[key];
              return (
                <div key={key} className="config-preview-row">
                  <span className={`status-badge status-badge--${item.status}`}>{item.status}</span>
                  <span className="config-preview-type">{item.type}</span>
                  <span className="project-name">{item.name}</span>
                  {item.detail && <span className="project-meta">{item.detail}</span>}
                  {item.status === "conflict" && (
                    <div className="config-preview-resolution">
                      <select
                        value={resolution?.action ?? "skip"}
                        onChange={(e) =>
                          updateResolution(item.type, item.name, { action: e.target.value as ResolutionAction })
                        }
                      >
                        <option value="skip">Skip</option>
                        <option value="overwrite">Overwrite</option>
                        <option value="rename">Import as new (rename)</option>
                      </select>
                      {resolution?.action === "rename" && (
                        <input
                          placeholder="New name"
                          value={resolution.newName}
                          onChange={(e) => updateResolution(item.type, item.name, { newName: e.target.value })}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="form-actions">
            <button className="primary" onClick={handleConfirm} disabled={loading}>
              {loading ? "Importing…" : "Confirm Import"}
            </button>
          </div>
        </>
      )}

      {summary && (
        <div className="script-run-result script-run-result--success">
          {summary.imported} imported, {summary.skipped} skipped
          {summary.warnings.length > 0 && (
            <ul className="script-run-history">
              {summary.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}

import { useState } from "react";
import type { DbConnection, DbScript } from "@tuldep/shared";
import * as api from "../../api";
import { Modal } from "../Modal";

interface ExportConfigModalProps {
  connections: DbConnection[];
  scripts: DbScript[];
  onClose: () => void;
}

export function ExportConfigModal({ connections, scripts, onClose }: ExportConfigModalProps) {
  const [selectedConnections, setSelectedConnections] = useState<Record<string, boolean>>(
    Object.fromEntries(connections.map((c) => [c.id, true])),
  );
  const [selectedScripts, setSelectedScripts] = useState<Record<string, boolean>>(
    Object.fromEntries(scripts.map((s) => [s.id, true])),
  );
  const [exporting, setExporting] = useState(false);

  function selectAll() {
    setSelectedConnections(Object.fromEntries(connections.map((c) => [c.id, true])));
    setSelectedScripts(Object.fromEntries(scripts.map((s) => [s.id, true])));
  }

  function selectNone() {
    setSelectedConnections(Object.fromEntries(connections.map((c) => [c.id, false])));
    setSelectedScripts(Object.fromEntries(scripts.map((s) => [s.id, false])));
  }

  async function handleDownload() {
    setExporting(true);
    try {
      const connectionIds = Object.entries(selectedConnections)
        .filter(([, checked]) => checked)
        .map(([id]) => id);
      const scriptIds = Object.entries(selectedScripts)
        .filter(([, checked]) => checked)
        .map(([id]) => id);
      await api.exportConfig(connectionIds, scriptIds);
      onClose();
    } finally {
      setExporting(false);
    }
  }

  return (
    <Modal title="Export Config" onClose={onClose}>
      <div className="script-run-result script-run-result--error">
        File ini berisi connection string (termasuk credential database). Pastikan hanya dibagikan ke pihak
        yang terpercaya.
      </div>

      <div className="config-modal-actions">
        <button type="button" onClick={selectAll}>
          Select All
        </button>
        <button type="button" onClick={selectNone}>
          Select None
        </button>
      </div>

      <h3>Connections</h3>
      <div className="config-checkbox-list">
        {connections.length === 0 && <p className="empty-state">Nothing to export yet — add a connection first.</p>}
        {connections.map((c) => (
          <label key={c.id} className="config-checkbox-row">
            <input
              type="checkbox"
              checked={!!selectedConnections[c.id]}
              onChange={() => setSelectedConnections((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
            />
            <span className={`kind-badge kind-badge--${c.kind}`}>{c.kind}</span>
            <span>{c.name}</span>
          </label>
        ))}
      </div>

      <h3>Scripts</h3>
      <div className="config-checkbox-list">
        {scripts.length === 0 && <p className="empty-state">Nothing to export yet — add a script first.</p>}
        {scripts.map((s) => (
          <label key={s.id} className="config-checkbox-row">
            <input
              type="checkbox"
              checked={!!selectedScripts[s.id]}
              onChange={() => setSelectedScripts((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
            />
            <span className={`kind-badge kind-badge--${s.kind}`}>{s.kind}</span>
            <span>{s.name}</span>
          </label>
        ))}
      </div>

      <div className="form-actions">
        <button className="primary" onClick={handleDownload} disabled={exporting}>
          {exporting ? "Preparing…" : "Download JSON"}
        </button>
      </div>
    </Modal>
  );
}

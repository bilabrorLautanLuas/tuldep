import { useEffect, useState } from "react";
import type { ProjectSuggestion, ScanSettings } from "@tuldep/shared";
import * as api from "../../api";
import { Modal } from "../Modal";
import { SuggestionRow } from "./SuggestionRow";

interface DiscoverProjectsModalProps {
  onClose: () => void;
  onImported: () => void;
}

export function DiscoverProjectsModal({ onClose, onImported }: DiscoverProjectsModalProps) {
  const [settings, setSettings] = useState<ScanSettings | null>(null);
  const [rootPath, setRootPath] = useState("");
  const [maxDepth, setMaxDepth] = useState(2);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ProjectSuggestion[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [commands, setCommands] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    api.getScanSettings().then((s) => {
      setSettings(s);
      setRootPath(s.rootPath);
      setMaxDepth(s.maxDepth);
    });
  }, []);

  async function handleScan() {
    if (!rootPath) return;
    setScanning(true);
    setError(null);
    try {
      const results = await api.discoverProjects({ rootPath, maxDepth });
      setSuggestions(results);
      setSelected(Object.fromEntries(results.map((r) => [r.path, true])));
      setCommands(Object.fromEntries(results.map((r) => [r.path, r.suggestedCommand])));
      // Persisting the last-used settings is a convenience, not part of the scan
      // result — a failure here must not wipe out results the scan already found.
      try {
        await api.saveScanSettings({
          rootPath,
          maxDepth,
          excludePatterns: settings?.excludePatterns ?? [],
        });
      } catch (settingsErr) {
        console.error("failed to save scan settings", settingsErr);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSuggestions([]);
    } finally {
      setScanning(false);
    }
  }

  async function handleImport() {
    const toImport = suggestions
      .filter((s) => selected[s.path])
      .map((s) => ({
        name: s.name,
        cwd: s.path,
        command: commands[s.path] ?? s.suggestedCommand,
        env: s.env,
      }));
    if (toImport.length === 0) return;
    setImporting(true);
    try {
      await api.importProjects(toImport);
      onImported();
      onClose();
    } finally {
      setImporting(false);
    }
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <Modal title="Discover Projects" onClose={onClose}>
      <div className="discover-form">
        <input
          placeholder="~/projects"
          value={rootPath}
          onChange={(e) => setRootPath(e.target.value)}
        />
        <input
          type="number"
          min={1}
          value={maxDepth}
          onChange={(e) => setMaxDepth(Number(e.target.value) || 1)}
          className="max-depth-input"
        />
        <button className="primary" onClick={handleScan} disabled={scanning || !rootPath || !settings}>
          {scanning ? "Scanning…" : "Scan"}
        </button>
      </div>

      {error && <div className="script-run-result script-run-result--error">{error}</div>}

      {suggestions.length > 0 && (
        <>
          <div className="suggestion-list">
            {suggestions.map((s) => (
              <SuggestionRow
                key={s.path}
                suggestion={s}
                selected={!!selected[s.path]}
                command={commands[s.path] ?? s.suggestedCommand}
                onToggle={() => setSelected((prev) => ({ ...prev, [s.path]: !prev[s.path] }))}
                onCommandChange={(value) => setCommands((prev) => ({ ...prev, [s.path]: value }))}
              />
            ))}
          </div>
          <button className="primary" onClick={handleImport} disabled={importing || selectedCount === 0}>
            Import Selected ({selectedCount})
          </button>
        </>
      )}

      {!scanning && suggestions.length === 0 && !error && (
        <p className="empty-state">No results yet — run a scan.</p>
      )}
    </Modal>
  );
}

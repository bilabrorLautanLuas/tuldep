import { useCallback, useEffect, useState } from "react";
import type { DbConnection, DbScript, DbScriptRunResult } from "@tuldep/shared";
import * as api from "../../api";
import { ConnectionForm } from "./ConnectionForm";
import { DbConnectionsList } from "./DbConnectionsList";
import { ScriptForm } from "./ScriptForm";
import { DbScriptsList } from "./DbScriptsList";
import { Modal } from "../Modal";
import { ExportConfigModal } from "./ExportConfigModal";
import { ImportConfigModal } from "./ImportConfigModal";

export function DbScriptsPage() {
  const [connections, setConnections] = useState<DbConnection[]>([]);
  const [scripts, setScripts] = useState<DbScript[]>([]);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; error?: string }>>({});
  const [lastResults, setLastResults] = useState<Record<string, DbScriptRunResult>>({});
  const [history, setHistory] = useState<Record<string, DbScriptRunResult[]>>({});
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const refreshHistoryFor = useCallback(async (scriptList: DbScript[]) => {
    const entries = await Promise.all(
      scriptList.map(async (s) => [s.id, await api.getDbScriptHistory(s.id)] as const),
    );
    setHistory(Object.fromEntries(entries));
  }, []);

  const refresh = useCallback(async () => {
    const [conns, scriptList] = await Promise.all([api.listDbConnections(), api.listDbScripts()]);
    setConnections(conns);
    setScripts(scriptList);
    await refreshHistoryFor(scriptList);
  }, [refreshHistoryFor]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleTestConnection(id: string) {
    const result = await api.testDbConnection(id);
    setTestResults((prev) => ({ ...prev, [id]: result }));
  }

  async function handleDeleteConnection(id: string) {
    await api.deleteDbConnection(id);
    refresh();
  }

  async function handleRunScript(id: string, confirmed?: boolean) {
    setRunningIds((prev) => new Set(prev).add(id));
    try {
      const result = await api.runDbScript(id, confirmed);
      setLastResults((prev) => ({ ...prev, [id]: result }));
      const runHistory = await api.getDbScriptHistory(id);
      setHistory((prev) => ({ ...prev, [id]: runHistory }));
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleDeleteScript(id: string) {
    await api.deleteDbScript(id);
    refresh();
  }

  async function handleClearAll() {
    const confirmed = window.confirm(
      `Hapus SEMUA data di halaman ini (${connections.length} connection, ${scripts.length} script, beserta history run-nya)? Tindakan ini tidak bisa dibatalkan.`,
    );
    if (!confirmed) return;
    setClearing(true);
    try {
      await api.clearAllDbData();
      setTestResults({});
      setLastResults({});
      setEditingConnectionId(null);
      setEditingScriptId(null);
    } finally {
      setClearing(false);
      refresh();
    }
  }

  const editingConnection = connections.find((c) => c.id === editingConnectionId) ?? null;
  const editingScript = scripts.find((s) => s.id === editingScriptId) ?? null;

  return (
    <div className="dashboard">
      <div className="dashboard-toolbar">
        <button onClick={() => setExportOpen(true)}>Export Config</button>
        <button onClick={() => setImportOpen(true)}>Import Config</button>
        <button className="danger" disabled={connections.length === 0 || clearing} onClick={handleClearAll}>
          {clearing ? <span className="spinner" /> : "🗑 Clear Data"}
        </button>
      </div>

      <ConnectionForm
        mode="create"
        onSubmit={async (input) => {
          await api.createDbConnection(input);
          refresh();
        }}
      />
      <DbConnectionsList
        connections={connections}
        testResults={testResults}
        onTest={handleTestConnection}
        onEdit={setEditingConnectionId}
        onDelete={handleDeleteConnection}
      />

      <ScriptForm
        mode="create"
        connections={connections}
        onSubmit={async (input) => {
          await api.createDbScript(input);
          refresh();
        }}
      />
      <DbScriptsList
        connections={connections}
        scripts={scripts}
        lastResults={lastResults}
        history={history}
        runningIds={runningIds}
        onRun={handleRunScript}
        onEdit={setEditingScriptId}
        onDelete={handleDeleteScript}
      />

      {editingConnection && (
        <Modal title="Edit Connection" onClose={() => setEditingConnectionId(null)}>
          <ConnectionForm
            mode="edit"
            initialConnection={editingConnection}
            onSubmit={async (input) => {
              await api.updateDbConnection(editingConnection.id, input);
              setEditingConnectionId(null);
              refresh();
            }}
            onCancel={() => setEditingConnectionId(null)}
          />
        </Modal>
      )}

      {editingScript && (
        <Modal title="Edit Script" onClose={() => setEditingScriptId(null)}>
          <ScriptForm
            mode="edit"
            connections={connections}
            initialScript={editingScript}
            onSubmit={async (input) => {
              await api.updateDbScript(editingScript.id, input);
              setEditingScriptId(null);
              refresh();
            }}
            onCancel={() => setEditingScriptId(null)}
          />
        </Modal>
      )}

      {exportOpen && (
        <ExportConfigModal connections={connections} scripts={scripts} onClose={() => setExportOpen(false)} />
      )}

      {importOpen && <ImportConfigModal onClose={() => setImportOpen(false)} onImported={refresh} />}
    </div>
  );
}

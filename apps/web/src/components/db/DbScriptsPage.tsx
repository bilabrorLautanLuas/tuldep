import { useCallback, useEffect, useState } from "react";
import type { DbConnection, DbScript, DbScriptRunResult } from "@tuldep/shared";
import * as api from "../../api";
import { AddConnectionForm } from "./AddConnectionForm";
import { DbConnectionsList } from "./DbConnectionsList";
import { AddScriptForm } from "./AddScriptForm";
import { DbScriptsList } from "./DbScriptsList";

export function DbScriptsPage() {
  const [connections, setConnections] = useState<DbConnection[]>([]);
  const [scripts, setScripts] = useState<DbScript[]>([]);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; error?: string }>>({});
  const [lastResults, setLastResults] = useState<Record<string, DbScriptRunResult>>({});
  const [history, setHistory] = useState<Record<string, DbScriptRunResult[]>>({});

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
    const result = await api.runDbScript(id, confirmed);
    setLastResults((prev) => ({ ...prev, [id]: result }));
    const runHistory = await api.getDbScriptHistory(id);
    setHistory((prev) => ({ ...prev, [id]: runHistory }));
  }

  async function handleDeleteScript(id: string) {
    await api.deleteDbScript(id);
    refresh();
  }

  return (
    <div className="dashboard">
      <AddConnectionForm onAdded={refresh} />
      <DbConnectionsList
        connections={connections}
        testResults={testResults}
        onTest={handleTestConnection}
        onDelete={handleDeleteConnection}
      />

      <AddScriptForm connections={connections} onAdded={refresh} />
      <DbScriptsList
        connections={connections}
        scripts={scripts}
        lastResults={lastResults}
        history={history}
        onRun={handleRunScript}
        onDelete={handleDeleteScript}
      />
    </div>
  );
}

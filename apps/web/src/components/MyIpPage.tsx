import { useCallback, useEffect, useRef, useState } from "react";
import type { MyIpInfo } from "@tuldep/shared";
import * as api from "../api";

export function MyIpPage() {
  const [info, setInfo] = useState<MyIpInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInfo(await api.getMyIp());
    } catch (err) {
      setInfo(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => clearTimeout(copiedTimer.current);
  }, [load]);

  async function handleCopy() {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.ip);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  const rows: [string, string | undefined][] = info
    ? [
        ["City", info.city],
        ["Region", info.region],
        ["Country", info.country],
        ["ISP / Org", info.org],
        ["Timezone", info.timezone],
      ]
    : [];

  return (
    <div className="dashboard">
      <div className="project-card my-ip-card">
        <div className="project-card-title">
          <span className={`status-dot status-dot--${error ? "crashed" : info ? "running" : "stopped"}`} />
          <span>Public IP</span>
        </div>

        {loading && (
          <div className="project-meta my-ip-loading">
            <span className="spinner" /> Fetching network info…
          </div>
        )}

        {!loading && error && (
          <>
            <div className="script-run-result script-run-result--error">{error}</div>
            <div className="project-card-actions">
              <button className="primary" onClick={load}>
                Retry
              </button>
            </div>
          </>
        )}

        {!loading && info && (
          <>
            <div className="my-ip-address">
              <span className="project-command">{info.ip}</span>
              <div className="project-card-actions">
                <button onClick={handleCopy}>{copied ? "Copied" : "Copy IP"}</button>
              </div>
            </div>
            <dl className="my-ip-fields">
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt className="project-meta">{label}</dt>
                  <dd>{value || "—"}</dd>
                </div>
              ))}
            </dl>
            <div className="project-card-actions">
              <button onClick={load}>Refresh</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

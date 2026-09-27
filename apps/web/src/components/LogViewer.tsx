import { useEffect, useRef } from "react";
import { useProjectLogs } from "../useProjectLogs";
import * as api from "../api";

interface LogViewerProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export function LogViewer({ projectId, projectName, onClose }: LogViewerProps) {
  const { lines, clear } = useProjectLogs(projectId);
  const scrollRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  async function handleClearLog() {
    if (!window.confirm("Hapus semua log untuk project ini?")) return;
    await api.clearProjectLog(projectId);
    clear();
  }

  return (
    <div className="log-viewer">
      <div className="log-viewer-header">
        <span>Logs — {projectName}</span>
        <div className="log-viewer-header-actions">
          <button onClick={handleClearLog} title="Clear log">
            🗑 Clear Log
          </button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
      <pre className="log-viewer-body" ref={scrollRef}>
        {lines.join("\n")}
      </pre>
    </div>
  );
}

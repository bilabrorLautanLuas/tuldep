import { useEffect, useRef } from "react";
import { useProjectLogs } from "../useProjectLogs";

interface LogViewerProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export function LogViewer({ projectId, projectName, onClose }: LogViewerProps) {
  const lines = useProjectLogs(projectId);
  const scrollRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div className="log-viewer">
      <div className="log-viewer-header">
        <span>Logs — {projectName}</span>
        <button onClick={onClose}>Close</button>
      </div>
      <pre className="log-viewer-body" ref={scrollRef}>
        {lines.join("\n")}
      </pre>
    </div>
  );
}

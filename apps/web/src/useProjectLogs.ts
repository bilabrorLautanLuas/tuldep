import { useEffect, useState } from "react";

type LogMessage = { type: "initial"; lines: string[] } | { type: "line"; line: string };

export function useProjectLogs(projectId: string | null): string[] {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (!projectId) {
      setLines([]);
      return;
    }
    setLines([]);
    const ws = new WebSocket(`ws://localhost:4100/ws/logs/${projectId}`);
    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data) as LogMessage;
      if (msg.type === "initial") setLines(msg.lines);
      else setLines((prev) => [...prev, msg.line]);
    };
    return () => ws.close();
  }, [projectId]);

  return lines;
}

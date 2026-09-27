import { EventEmitter } from "node:events";
import { mkdirSync } from "node:fs";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";

const LOG_DIR = join("data", "logs");
const RING_SIZE = 500;

mkdirSync(LOG_DIR, { recursive: true });

const ringBuffers = new Map<string, string[]>();
const emitters = new Map<string, EventEmitter>();

function logPathFor(projectId: string): string {
  return join(LOG_DIR, `${projectId}.log`);
}

function getEmitter(projectId: string): EventEmitter {
  let emitter = emitters.get(projectId);
  if (!emitter) {
    emitter = new EventEmitter();
    emitters.set(projectId, emitter);
  }
  return emitter;
}

function pushToRing(projectId: string, line: string): void {
  const buffer = ringBuffers.get(projectId) ?? [];
  buffer.push(line);
  if (buffer.length > RING_SIZE) buffer.shift();
  ringBuffers.set(projectId, buffer);
}

export function appendLine(projectId: string, line: string): void {
  pushToRing(projectId, line);
  appendFile(logPathFor(projectId), line + "\n").catch((err) => {
    console.error(`[logStore] failed to write log for ${projectId}:`, err);
  });
  getEmitter(projectId).emit("line", line);
}

export function subscribe(projectId: string, onLine: (line: string) => void): () => void {
  const emitter = getEmitter(projectId);
  emitter.on("line", onLine);
  return () => emitter.off("line", onLine);
}

export function getBuffer(projectId: string): string[] {
  return ringBuffers.get(projectId) ?? [];
}

import { Hono } from "hono";
import { cors } from "hono/cors";
import { upgradeWebSocket, websocket } from "hono/bun";
import { projectsRouter } from "./routes/projects";
import { dbConnectionsRouter } from "./routes/dbConnections";
import { dbScriptsRouter } from "./routes/dbScripts";
import { scanRouter } from "./routes/scan";
import { configRouter } from "./routes/config";
import { enginesRouter } from "./routes/engines";
import * as logStore from "./logStore";

const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: "http://localhost:5273",
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    exposeHeaders: ["Content-Disposition"],
  }),
);

app.route("/api/projects", projectsRouter);
app.route("/api/db-connections", dbConnectionsRouter);
app.route("/api/db-scripts", dbScriptsRouter);
app.route("/api", scanRouter);
app.route("/api", configRouter);
app.route("/api/engines", enginesRouter);

app.get(
  "/ws/logs/:projectId",
  upgradeWebSocket((c) => {
    const projectId = c.req.param("projectId")!;
    let unsubscribe: (() => void) | null = null;
    return {
      onOpen(_evt, ws) {
        ws.send(JSON.stringify({ type: "initial", lines: logStore.getBuffer(projectId) }));
        unsubscribe = logStore.subscribe(projectId, (line) => {
          ws.send(JSON.stringify({ type: "line", line }));
        });
      },
      onClose() {
        unsubscribe?.();
      },
    };
  }),
);

const port = Number(process.env.PORT ?? 4100);

console.log(`Tuldep server listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
  websocket,
};

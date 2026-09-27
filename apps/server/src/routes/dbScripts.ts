import { Hono } from "hono";
import { CreateDbScriptSchema, RunDbScriptRequestSchema, UpdateDbScriptSchema } from "@tuldep/shared";
import * as db from "../db";
import * as runner from "../dbScriptRunner";

export const dbScriptsRouter = new Hono();

dbScriptsRouter.get("/", (c) => c.json(db.getDbScripts()));

dbScriptsRouter.post("/", async (c) => {
  const body = CreateDbScriptSchema.parse(await c.req.json());
  return c.json(db.createDbScript(body), 201);
});

dbScriptsRouter.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = UpdateDbScriptSchema.parse(await c.req.json());
  const updated = db.updateDbScript(id, body);
  if (!updated) return c.json({ error: "not found" }, 404);
  return c.json(updated);
});

dbScriptsRouter.delete("/:id", (c) => {
  db.deleteDbScript(c.req.param("id"));
  return c.body(null, 204);
});

dbScriptsRouter.post("/:id/run", async (c) => {
  const script = db.getDbScript(c.req.param("id"));
  if (!script) return c.json({ error: "script not found" }, 404);

  const connection = db.getDbConnection(script.connectionId);
  if (!connection) return c.json({ error: "connection not found" }, 404);

  const body = RunDbScriptRequestSchema.parse(await c.req.json().catch(() => ({})));
  // No more action tag to tell destructive from safe — always require confirmation.
  if (body.confirmed !== true) {
    return c.json({ error: "confirmation required" }, 400);
  }

  const result = await runner.runScript(connection, script);
  db.recordScriptRun(result);
  return c.json(result, 200);
});

dbScriptsRouter.get("/:id/history", (c) => {
  const script = db.getDbScript(c.req.param("id"));
  if (!script) return c.json({ error: "script not found" }, 404);
  const limitParam = Number(c.req.query("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 10;
  return c.json(db.getScriptRunHistory(script.id, limit));
});

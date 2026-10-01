import { Hono } from "hono";
import { ClearAllRequestSchema, CreateDbConnectionSchema, UpdateDbConnectionSchema } from "@tuldep/shared";
import * as db from "../db";
import * as pool from "../dbConnectionPool";

export const dbConnectionsRouter = new Hono();

dbConnectionsRouter.get("/", (c) => c.json(db.getDbConnections()));

dbConnectionsRouter.post("/", async (c) => {
  const body = CreateDbConnectionSchema.parse(await c.req.json());
  return c.json(db.createDbConnection(body), 201);
});

// Clears the whole DB Scripts page: every connection, and (by cascade) every script and run history.
dbConnectionsRouter.post("/clear", async (c) => {
  const body = ClearAllRequestSchema.parse(await c.req.json().catch(() => ({})));
  if (body.confirmed !== true) {
    return c.json({ error: "confirmation required" }, 400);
  }
  const deleted = db.getDbConnections().length;
  db.deleteAllDbConnections();
  return c.json({ deleted });
});

dbConnectionsRouter.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = UpdateDbConnectionSchema.parse(await c.req.json());
  const updated = db.updateDbConnection(id, body);
  if (!updated) return c.json({ error: "not found" }, 404);
  return c.json(updated);
});

dbConnectionsRouter.delete("/:id", (c) => {
  db.deleteDbConnection(c.req.param("id"));
  return c.body(null, 204);
});

dbConnectionsRouter.post("/:id/test", async (c) => {
  const connection = db.getDbConnection(c.req.param("id"));
  if (!connection) return c.json({ error: "not found" }, 404);
  return c.json(await pool.testConnection(connection));
});

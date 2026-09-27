import { Hono } from "hono";
import { CreateDbConnectionSchema } from "@tuldep/shared";
import * as db from "../db";
import * as pool from "../dbConnectionPool";

export const dbConnectionsRouter = new Hono();

dbConnectionsRouter.get("/", (c) => c.json(db.getDbConnections()));

dbConnectionsRouter.post("/", async (c) => {
  const body = CreateDbConnectionSchema.parse(await c.req.json());
  return c.json(db.createDbConnection(body), 201);
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

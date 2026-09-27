import { Hono } from "hono";
import { ExportConfigRequestSchema, ImportApplyRequestSchema, ImportPreviewRequestSchema } from "@tuldep/shared";
import * as exporter from "../configExporter";
import * as importer from "../configImporter";

export const configRouter = new Hono();

configRouter.post("/config/export", async (c) => {
  const body = ExportConfigRequestSchema.parse(await c.req.json().catch(() => ({})));
  const config = exporter.exportConfig(body.connectionIds, body.scriptIds);
  const date = new Date().toISOString().slice(0, 10);
  c.header("Content-Disposition", `attachment; filename="tuldep-config-${date}.json"`);
  return c.json(config);
});

configRouter.post("/config/import/preview", async (c) => {
  let body;
  try {
    body = ImportPreviewRequestSchema.parse(await c.req.json());
  } catch (err) {
    return c.json({ error: "Invalid config file — not a recognized Tuldep config format" }, 400);
  }
  return c.json(importer.validateImport(body.config));
});

configRouter.post("/config/import/apply", async (c) => {
  let body;
  try {
    body = ImportApplyRequestSchema.parse(await c.req.json());
  } catch (err) {
    return c.json({ error: "Invalid config file — not a recognized Tuldep config format" }, 400);
  }
  return c.json(importer.applyImport(body.config, body.resolutions));
});

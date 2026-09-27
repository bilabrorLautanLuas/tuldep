import { Hono } from "hono";
import { DiscoverRequestSchema, UpdateScanSettingsSchema } from "@tuldep/shared";
import * as db from "../db";
import * as scanner from "../projectScanner";

export const scanRouter = new Hono();

scanRouter.get("/scan-settings", (c) => c.json(db.getScanSettings()));

scanRouter.put("/scan-settings", async (c) => {
  const body = UpdateScanSettingsSchema.parse(await c.req.json());
  return c.json(db.saveScanSettings(body));
});

scanRouter.get("/scan/scripts-preview", async (c) => {
  const cwd = c.req.query("cwd");
  if (!cwd) return c.json({ scripts: [], packageManager: null, message: "cwd is required" }, 400);
  return c.json(await scanner.getAvailableScripts(cwd));
});

scanRouter.post("/scan/discover", async (c) => {
  const body = DiscoverRequestSchema.parse(await c.req.json().catch(() => ({})));
  const settings = db.getScanSettings();
  const rootPath = body.rootPath ?? settings.rootPath;
  const maxDepth = body.maxDepth ?? settings.maxDepth;

  if (!rootPath) return c.json({ error: "rootPath is required" }, 400);

  try {
    const suggestions = await scanner.scanForProjects(rootPath, maxDepth, settings.excludePatterns);
    return c.json(suggestions);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});

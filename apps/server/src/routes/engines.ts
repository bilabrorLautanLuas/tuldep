import { Hono } from "hono";
import { VerifyEngineRequestSchema } from "@tuldep/shared";
import * as engineDetector from "../engineDetector";

export const enginesRouter = new Hono();

enginesRouter.get("/detect", async (c) => {
  const type = c.req.query("type");
  if (type !== "node" && type !== "php") {
    return c.json({ error: "type must be 'node' or 'php'" }, 400);
  }
  const refresh = c.req.query("refresh") === "true";
  const engines =
    type === "node" ? await engineDetector.detectNodeVersions(refresh) : await engineDetector.detectPhpVersions(refresh);
  return c.json(engines);
});

enginesRouter.post("/verify", async (c) => {
  let body;
  try {
    body = VerifyEngineRequestSchema.parse(await c.req.json());
  } catch {
    return c.json({ valid: false, error: "Invalid request body" }, 400);
  }
  const result = await engineDetector.verifyEngine(body.path, body.type);
  return c.json(result);
});

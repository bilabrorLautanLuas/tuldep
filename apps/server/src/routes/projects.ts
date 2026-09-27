import { Hono } from "hono";
import { CreateProjectSchema } from "@tuldep/shared";
import * as db from "../db";
import * as pm from "../processManager";

export const projectsRouter = new Hono();

projectsRouter.get("/", (c) => {
  const projects = db.getProjects();
  const withStatus = projects.map((p) => ({ ...p, status: pm.getStatus(p.id) }));
  return c.json(withStatus);
});

projectsRouter.post("/", async (c) => {
  const body = CreateProjectSchema.parse(await c.req.json());
  const project = db.createProject(body);
  return c.json(project, 201);
});

projectsRouter.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await pm.stopProject(id);
  db.deleteProject(id);
  return c.body(null, 204);
});

projectsRouter.post("/:id/start", (c) => {
  const id = c.req.param("id");
  const project = db.getProject(id);
  if (!project) return c.json({ error: "not found" }, 404);
  const status = pm.startProject(project);
  return c.json({ status });
});

projectsRouter.post("/:id/stop", async (c) => {
  const id = c.req.param("id");
  const status = await pm.stopProject(id);
  return c.json({ status });
});

projectsRouter.get("/:id/status", (c) => {
  return c.json({ status: pm.getStatus(c.req.param("id")) });
});

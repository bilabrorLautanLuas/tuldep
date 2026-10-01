import { Hono } from "hono";
import {
  ClearAllRequestSchema,
  CreateProjectSchema,
  ImportProjectsRequestSchema,
  UpdateProjectSchema,
} from "@tuldep/shared";
import * as db from "../db";
import * as pm from "../processManager";
import * as logStore from "../logStore";
import * as scanner from "../projectScanner";

export const projectsRouter = new Hono();

projectsRouter.get("/", (c) => {
  const projects = db.getProjects();
  const withStatus = projects.map((p) => ({ ...p, status: pm.getStatus(p.id) }));
  return c.json(withStatus);
});

projectsRouter.post("/", async (c) => {
  let body;
  try {
    body = CreateProjectSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: "Invalid project input" }, 400);
  }
  const project = db.createProject(body);
  return c.json(project, 201);
});

projectsRouter.post("/import", async (c) => {
  const body = ImportProjectsRequestSchema.parse(await c.req.json());
  const imported = db.importProjects(body.suggestions);
  return c.json(imported, 201);
});

projectsRouter.post("/clear", async (c) => {
  const body = ClearAllRequestSchema.parse(await c.req.json().catch(() => ({})));
  if (body.confirmed !== true) {
    return c.json({ error: "confirmation required" }, 400);
  }
  const projects = db.getProjects();
  // stop first so no orphan process keeps running (and holding its port) without a project row
  await Promise.all(projects.map((p) => pm.stopProject(p.id)));
  db.deleteAllProjects();
  await Promise.all(projects.map((p) => logStore.clearProjectLog(p.id)));
  return c.json({ deleted: projects.length });
});

projectsRouter.put("/:id", async (c) => {
  const id = c.req.param("id");
  let body;
  try {
    body = UpdateProjectSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: "Invalid project input" }, 400);
  }
  const updated = db.updateProject(id, body);
  if (!updated) return c.json({ error: "not found" }, 404);
  const status = pm.getStatus(id);
  const notice =
    status === "running" ? "Perubahan tersimpan, restart project untuk menerapkan config baru" : undefined;
  return c.json({ project: updated, status, notice });
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

projectsRouter.delete("/:id/logs", async (c) => {
  await logStore.clearProjectLog(c.req.param("id"));
  return c.json({ success: true });
});

projectsRouter.get("/:id/available-scripts", async (c) => {
  const project = db.getProject(c.req.param("id"));
  if (!project) return c.json({ error: "not found" }, 404);
  return c.json(await scanner.getAvailableScripts(project.cwd));
});

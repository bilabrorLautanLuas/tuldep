import { z } from "zod";

// ---- Project ----
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  cwd: z.string().min(1),
  command: z.string().min(1),
  env: z.record(z.string(), z.string()),
  createdAt: z.number(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = ProjectSchema.omit({ id: true, createdAt: true });
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

// ---- ProjectStatus ----
export const ProjectStatusSchema = z.enum(["stopped", "running", "crashed"]);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProjectWithStatusSchema = ProjectSchema.extend({
  status: ProjectStatusSchema,
});
export type ProjectWithStatus = z.infer<typeof ProjectWithStatusSchema>;

// ---- DbConnection ----
export const DbConnectionKindSchema = z.enum(["postgres", "mongodb"]);
export type DbConnectionKind = z.infer<typeof DbConnectionKindSchema>;

export const DbConnectionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  kind: DbConnectionKindSchema,
  connectionString: z.string().min(1),
  createdAt: z.number(),
});
export type DbConnection = z.infer<typeof DbConnectionSchema>;

export const CreateDbConnectionSchema = DbConnectionSchema.omit({ id: true, createdAt: true });
export type CreateDbConnectionInput = z.infer<typeof CreateDbConnectionSchema>;

// ---- DbScript ----
export const DbScriptActionSchema = z.enum(["seed", "reset", "migrate", "custom"]);
export type DbScriptAction = z.infer<typeof DbScriptActionSchema>;

export const DESTRUCTIVE_DB_SCRIPT_ACTIONS: readonly DbScriptAction[] = ["reset", "custom"];
export function isDestructiveAction(action: DbScriptAction): boolean {
  return (DESTRUCTIVE_DB_SCRIPT_ACTIONS as readonly string[]).includes(action);
}

export const DbScriptSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  connectionId: z.string(),
  action: DbScriptActionSchema,
  kind: DbConnectionKindSchema,
  payload: z.string().min(1),
  createdAt: z.number(),
});
export type DbScript = z.infer<typeof DbScriptSchema>;

export const CreateDbScriptSchema = DbScriptSchema.omit({ id: true, createdAt: true });
export type CreateDbScriptInput = z.infer<typeof CreateDbScriptSchema>;

// ---- Mongo script payload (kind === 'mongodb') ----
export const MongoScriptOperationSchema = z.enum(["deleteMany", "insertMany", "drop", "updateMany"]);
export type MongoScriptOperation = z.infer<typeof MongoScriptOperationSchema>;

export const MongoScriptPayloadSchema = z.object({
  collection: z.string().min(1),
  operation: MongoScriptOperationSchema,
  data: z.unknown().optional(),
});
export type MongoScriptPayload = z.infer<typeof MongoScriptPayloadSchema>;

// ---- Run result & run request ----
export const DbScriptRunResultSchema = z.object({
  scriptId: z.string(),
  success: z.boolean(),
  message: z.string(),
  durationMs: z.number(),
  ranAt: z.number(),
});
export type DbScriptRunResult = z.infer<typeof DbScriptRunResultSchema>;

export const RunDbScriptRequestSchema = z.object({ confirmed: z.boolean().optional() });
export type RunDbScriptRequest = z.infer<typeof RunDbScriptRequestSchema>;

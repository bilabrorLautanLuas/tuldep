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

export const UpdateProjectSchema = CreateProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

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

export const UpdateDbConnectionSchema = CreateDbConnectionSchema.partial();
export type UpdateDbConnectionInput = z.infer<typeof UpdateDbConnectionSchema>;

// ---- DbScript ----
export const DbScriptSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  connectionId: z.string(),
  kind: DbConnectionKindSchema,
  payload: z.string().min(1),
  createdAt: z.number(),
});
export type DbScript = z.infer<typeof DbScriptSchema>;

export const CreateDbScriptSchema = DbScriptSchema.omit({ id: true, createdAt: true });
export type CreateDbScriptInput = z.infer<typeof CreateDbScriptSchema>;

export const UpdateDbScriptSchema = CreateDbScriptSchema.partial();
export type UpdateDbScriptInput = z.infer<typeof UpdateDbScriptSchema>;

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

// ---- Project auto-discovery ----
export const ProjectDetectedTypeSchema = z.enum(["node", "bun", "laravel", "unknown"]);
export type ProjectDetectedType = z.infer<typeof ProjectDetectedTypeSchema>;

export const ProjectSuggestionSchema = z.object({
  path: z.string(),
  name: z.string(),
  detectedType: ProjectDetectedTypeSchema,
  suggestedCommand: z.string(),
  env: z.record(z.string(), z.string()),
});
export type ProjectSuggestion = z.infer<typeof ProjectSuggestionSchema>;

export const ScanSettingsSchema = z.object({
  id: z.string(),
  rootPath: z.string(),
  maxDepth: z.number().int().positive(),
  excludePatterns: z.array(z.string()),
});
export type ScanSettings = z.infer<typeof ScanSettingsSchema>;

export const UpdateScanSettingsSchema = ScanSettingsSchema.omit({ id: true });
export type UpdateScanSettingsInput = z.infer<typeof UpdateScanSettingsSchema>;

export const DiscoverRequestSchema = z.object({
  rootPath: z.string().optional(),
  maxDepth: z.number().int().positive().optional(),
});
export type DiscoverRequest = z.infer<typeof DiscoverRequestSchema>;

export const ImportProjectsRequestSchema = z.object({
  suggestions: z.array(CreateProjectSchema),
});
export type ImportProjectsRequest = z.infer<typeof ImportProjectsRequestSchema>;

// ---- package.json script discovery (for the Add/Edit Project form) ----
export const PackageManagerSchema = z.enum(["npm", "bun"]);
export type PackageManager = z.infer<typeof PackageManagerSchema>;

export const AvailableScriptSchema = z.object({
  name: z.string(),
  command: z.string(),
});
export type AvailableScript = z.infer<typeof AvailableScriptSchema>;

export const AvailableScriptsResponseSchema = z.object({
  scripts: z.array(AvailableScriptSchema),
  packageManager: PackageManagerSchema.nullable(),
  message: z.string().optional(),
});
export type AvailableScriptsResponse = z.infer<typeof AvailableScriptsResponseSchema>;

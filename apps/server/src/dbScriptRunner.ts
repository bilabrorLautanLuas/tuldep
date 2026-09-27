import type { DbConnection, DbScript, DbScriptRunResult } from "@tuldep/shared";
import { MongoScriptPayloadSchema } from "@tuldep/shared";
import { formatError, getMongoClient, getPostgresClient } from "./dbConnectionPool";

export async function runPostgresScript(connection: DbConnection, script: DbScript): Promise<DbScriptRunResult> {
  const ranAt = Date.now();
  try {
    const client = getPostgresClient(connection.connectionString);
    const result = await client.unsafe(script.payload);
    const message =
      typeof result.count === "number"
        ? `OK — ${result.count} row(s) affected`
        : `OK — statement executed (${result.length} row(s) returned)`;
    return { scriptId: script.id, success: true, message, durationMs: Date.now() - ranAt, ranAt };
  } catch (err) {
    return {
      scriptId: script.id,
      success: false,
      message: formatError(err),
      durationMs: Date.now() - ranAt,
      ranAt,
    };
  }
}

export async function runMongoScript(connection: DbConnection, script: DbScript): Promise<DbScriptRunResult> {
  const ranAt = Date.now();
  try {
    const payload = MongoScriptPayloadSchema.parse(JSON.parse(script.payload));
    const client = await getMongoClient(connection.connectionString);
    const coll = client.db().collection(payload.collection);

    let message: string;
    switch (payload.operation) {
      case "deleteMany": {
        const res = await coll.deleteMany((payload.data as Record<string, unknown>) ?? {});
        message = `deleted ${res.deletedCount} document(s)`;
        break;
      }
      case "insertMany": {
        if (!Array.isArray(payload.data)) {
          throw new Error("insertMany requires `data` to be an array of documents");
        }
        const res = await coll.insertMany(payload.data as Record<string, unknown>[]);
        message = `inserted ${res.insertedCount} document(s)`;
        break;
      }
      case "drop": {
        await coll.drop();
        message = `dropped collection '${payload.collection}'`;
        break;
      }
      case "updateMany": {
        const { filter, update } = (payload.data ?? {}) as {
          filter?: Record<string, unknown>;
          update?: Record<string, unknown>;
        };
        if (!filter || !update) {
          throw new Error("updateMany requires `data` to be { filter, update }");
        }
        const res = await coll.updateMany(filter, update);
        message = `matched ${res.matchedCount}, modified ${res.modifiedCount} document(s)`;
        break;
      }
    }
    return { scriptId: script.id, success: true, message, durationMs: Date.now() - ranAt, ranAt };
  } catch (err) {
    return {
      scriptId: script.id,
      success: false,
      message: formatError(err),
      durationMs: Date.now() - ranAt,
      ranAt,
    };
  }
}

export function runScript(connection: DbConnection, script: DbScript): Promise<DbScriptRunResult> {
  return connection.kind === "postgres" ? runPostgresScript(connection, script) : runMongoScript(connection, script);
}

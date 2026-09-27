import postgres from "postgres";
import { MongoClient } from "mongodb";
import type { DbConnection } from "@tuldep/shared";

const postgresClients = new Map<string, ReturnType<typeof postgres>>();
const mongoClients = new Map<string, Promise<MongoClient>>();

// Node wraps multi-address connect failures (e.g. localhost resolving to both
// ::1 and 127.0.0.1) in an AggregateError whose own `.message` is empty — the
// real per-attempt messages live in `.errors`. Drivers (postgres.js, mongodb)
// surface this raw, so unwrap it here for a message worth showing a user.
export function formatError(err: unknown): string {
  if (err instanceof AggregateError && err.errors.length > 0) {
    return err.errors.map((e) => (e instanceof Error ? e.message : String(e))).join("; ");
  }
  if (err instanceof Error && err.message) return err.message;
  return String(err);
}

export function getPostgresClient(connectionString: string): ReturnType<typeof postgres> {
  let client = postgresClients.get(connectionString);
  if (!client) {
    client = postgres(connectionString, { connect_timeout: 5 });
    postgresClients.set(connectionString, client);
  }
  return client;
}

export function getMongoClient(connectionString: string): Promise<MongoClient> {
  let clientPromise = mongoClients.get(connectionString);
  if (!clientPromise) {
    clientPromise = new MongoClient(connectionString, { serverSelectionTimeoutMS: 5000 }).connect();
    clientPromise.catch(() => mongoClients.delete(connectionString));
    mongoClients.set(connectionString, clientPromise);
  }
  return clientPromise;
}

export async function testConnection(connection: DbConnection): Promise<{ ok: boolean; error?: string }> {
  try {
    if (connection.kind === "postgres") {
      await getPostgresClient(connection.connectionString)`SELECT 1`;
    } else {
      const client = await getMongoClient(connection.connectionString);
      await client.db().admin().ping();
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: formatError(err) };
  }
}

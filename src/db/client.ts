import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

export function createDb(url = process.env.DATABASE_URL, max = 5) {
  if (!url) throw new Error("DATABASE_URL is not set");
  // Neon's pooler runs PgBouncer in transaction mode, so skip named prepared statements.
  const client = postgres(url, { prepare: false, max });
  return { db: drizzle(client, { schema }), client };
}

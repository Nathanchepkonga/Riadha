import "server-only";
import { createDb, type DB } from "./client";

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { riadhaDb?: DB };

export const db: DB = globalForDb.riadhaDb ?? createDb().db;
if (process.env.NODE_ENV !== "production") globalForDb.riadhaDb = db;

export * as t from "./schema";

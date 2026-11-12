import "server-only";
import { createDb, type DB } from "./client";

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { riadhaDb?: DB };
let instance: DB | undefined;

// Lazy: build steps (e.g. Next's page-data collection) import this module without ever
// querying it, and must not require DATABASE_URL to be set just to evaluate the module.
function getDb(): DB {
  if (!instance) {
    instance = globalForDb.riadhaDb ?? createDb().db;
    if (process.env.NODE_ENV !== "production") globalForDb.riadhaDb = instance;
  }
  return instance;
}

export const db: DB = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export * as t from "./schema";

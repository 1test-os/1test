import { defineConfig } from "drizzle-kit";

/**
 * Drizzle configuration for SQLite backend.
 *
 * Usage:
 * - Generate migrations: drizzle-kit generate --config=drizzle.sqlite.config.ts
 * - Push schema (dev): drizzle-kit push --config=drizzle.sqlite.config.ts
 *
 * For push operations, set SQLITE_PATH or REPOSITORY_CONNECTION_STRING environment variable.
 * Defaults to ./dev.db for development.
 */

const dbPath =
  process.env.REPOSITORY_CONNECTION_STRING ||
  process.env.SQLITE_PATH ||
  "./dev.db";

export default defineConfig({
  out: "./src/storage/adapters/sqlite/migrations",
  schema: "./src/storage/adapters/sqlite/schema.ts",
  dialect: "sqlite",
  // dbCredentials only needed for push/pull operations
  dbCredentials: {
    url: dbPath,
  },
});

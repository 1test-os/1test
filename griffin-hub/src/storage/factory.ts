import { MigrationRunner } from "./ports.js";
import { Storage } from "./repositories.js";
import { PostgresStorage } from "./adapters/postgres/index.js";

// =============================================================================
// Backend types and configs
// =============================================================================

export type RepositoryBackendType = "memory" | "postgres";

export interface RepositoryConfig {
  backend: RepositoryBackendType;

  /**
   * For SQLite: file path or ':memory:'
   * For Postgres: connection string
   */
  connectionString?: string;
}

// =============================================================================
// Factory functions
// =============================================================================

/**
 * Create a storage backend based on configuration.
 */
export function createStorage(config: RepositoryConfig): Storage {
  switch (config.backend) {
    case "postgres":
      if (!config.connectionString) {
        throw new Error("Connection string required for Postgres backend");
      }
      return new PostgresStorage(config.connectionString);

    default:
      throw new Error(`Unknown repository backend: ${config.backend}`);
  }
}

/**
 * Create a migration runner for a storage backend.
 * Returns null for in-memory storage (no migrations needed).
 */
export function createMigrationRunner(
  storage: Storage,
  backendType: RepositoryBackendType,
): MigrationRunner | null {
  switch (backendType) {
    case "postgres":
      throw new Error("Postgres migration runner not yet implemented");

    default:
      throw new Error(`Unknown repository backend: ${backendType}`);
  }
}

// =============================================================================
// Config loaders
// =============================================================================

/**
 * Load repository configuration from environment variables.
 *
 * Environment variables:
 * - REPOSITORY_BACKEND:  'postgres'
 * - REPOSITORY_CONNECTION_STRING: connection string for the backend
 * - SQLITE_PATH: (alias for REPOSITORY_CONNECTION_STRING when using SQLite)
 * - POSTGRESQL_URL: (alias for REPOSITORY_CONNECTION_STRING when using Postgres)
 */
export function loadRepositoryConfig(): RepositoryConfig {
  const backend = process.env.REPOSITORY_BACKEND as RepositoryBackendType;

  let connectionString: string | undefined;

  if (backend === "postgres") {
    connectionString =
      process.env.REPOSITORY_CONNECTION_STRING || process.env.POSTGRESQL_URL;
    if (!connectionString) {
      throw new Error(
        "REPOSITORY_CONNECTION_STRING or POSTGRESQL_URL environment variable required for Postgres backend",
      );
    }
  }

  return { backend, connectionString };
}


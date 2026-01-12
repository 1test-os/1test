import { StorageBackend, MigrationRunner } from './ports.js';
import { MemoryStorage } from './adapters/memory/index.js';
import { SqliteStorage } from './adapters/sqlite/index.js';
import { PostgresStorage } from './adapters/postgres/index.js';
// TODO: Uncomment when implementing migration runners
// import { SqliteMigrationRunner } from './adapters/sqlite/migrations/runner.js';
// import { PostgresMigrationRunner } from './adapters/postgres/migrations/runner.js';

export type StorageBackendType = 'memory' | 'sqlite' | 'postgres';

export interface StorageConfig {
  backend: StorageBackendType;
  
  /**
   * For SQLite: file path or ':memory:'
   * For Postgres: connection string
   */
  connectionString?: string;
}

/**
 * Create a storage backend based on configuration.
 */
export function createStorage(config: StorageConfig): StorageBackend {
  switch (config.backend) {
    case 'memory':
      return new MemoryStorage();
    
    case 'sqlite':
      return new SqliteStorage(config.connectionString || ':memory:');
    
    case 'postgres':
      if (!config.connectionString) {
        throw new Error('Connection string required for Postgres backend');
      }
      return new PostgresStorage(config.connectionString);
    
    default:
      throw new Error(`Unknown storage backend: ${config.backend}`);
  }
}

/**
 * Create a migration runner for a storage backend.
 * Returns null for in-memory storage (no migrations needed).
 */
export function createMigrationRunner(
  backend: StorageBackend,
  backendType: StorageBackendType
): MigrationRunner | null {
  switch (backendType) {
    case 'memory':
      return null; // No migrations needed for in-memory storage
    
    case 'sqlite':
      // TODO: Extract db from SqliteStorage
      throw new Error('SQLite migration runner not yet implemented');
      // return new SqliteMigrationRunner(db);
    
    case 'postgres':
      // TODO: Extract pool from PostgresStorage
      throw new Error('Postgres migration runner not yet implemented');
      // return new PostgresMigrationRunner(pool);
    
    default:
      throw new Error(`Unknown storage backend: ${backendType}`);
  }
}

/**
 * Load storage configuration from environment variables.
 */
export function loadStorageConfig(): StorageConfig {
  const backend = (process.env.STORAGE_BACKEND || 'memory') as StorageBackendType;
  
  let connectionString: string | undefined;
  
  if (backend === 'sqlite') {
    connectionString = process.env.SQLITE_PATH || ':memory:';
  } else if (backend === 'postgres') {
    connectionString = process.env.POSTGRESQL_URL;
    if (!connectionString) {
      throw new Error('POSTGRESQL_URL environment variable required for Postgres backend');
    }
  }
  
  return { backend, connectionString };
}

/**
 * Storage module - exports all storage-related types and functions.
 */

// Core interfaces
export * from "./repositories.js";

// Migration interface
export type { MigrationRunner } from "./ports.js";

// Factory functions
export * from "./factory.js";

export { PostgresStorage } from "./adapters/postgres/index.js";

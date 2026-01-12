/**
 * Storage module - exports all storage-related types and functions.
 */

// Core interfaces
export * from './ports.js';

// Factory functions
export * from './factory.js';

// Adapters (if you need to import them directly for testing)
export { MemoryStorage } from './adapters/memory/index.js';
export { SqliteStorage } from './adapters/sqlite/index.js';
export { PostgresStorage } from './adapters/postgres/index.js';

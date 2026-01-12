import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { StorageBackend } from '../storage/ports.js';
import { createStorage, loadStorageConfig } from '../storage/factory.js';

// Extend Fastify's type system to include storage
declare module 'fastify' {
  interface FastifyInstance {
    storage: StorageBackend;
  }
}

/**
 * Fastify plugin that initializes and registers the storage backend.
 * 
 * The storage backend is configured via environment variables:
 * - STORAGE_BACKEND: 'memory' | 'sqlite' | 'postgres' (default: 'memory')
 * - SQLITE_PATH: Path to SQLite database file (default: ':memory:')
 * - POSTGRESQL_URL: PostgreSQL connection string (required for postgres backend)
 */
const storagePlugin: FastifyPluginAsync = async (fastify) => {
  // Load configuration from environment
  const config = loadStorageConfig();
  
  fastify.log.info({ backend: config.backend }, 'Initializing storage backend');
  
  // Create storage backend
  const storage = createStorage(config);
  
  // Connect to storage
  await storage.connect();
  
  // Register cleanup on shutdown
  fastify.addHook('onClose', async () => {
    fastify.log.info('Disconnecting storage backend');
    await storage.disconnect();
  });
  
  // Decorate Fastify instance with storage
  fastify.decorate('storage', storage);
};

export default fp(storagePlugin, {
  name: 'storage',
});

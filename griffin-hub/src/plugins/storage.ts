import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { Storage } from "../storage/index.js";
import { createStorage } from "../storage/factory.js";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../storage/adapters/postgres/schema.js";

// Extend Fastify's type system to include storage
declare module "fastify" {
  interface FastifyInstance {
    storage: Storage;
  }
}

export type DrizzleDatabase = NodePgDatabase<typeof schema>;

/**
 * Fastify plugin that initializes and registers the storage backend.
 * Configuration is loaded from fastify.config (provided by the config plugin).
 */
const storagePlugin: FastifyPluginAsync = async (fastify) => {
  const { repository: repoConfig } = fastify.config;

  fastify.log.info(
    {
      repositoryBackend: repoConfig.backend,
    },
    "Initializing storage backend",
  );

  // Create storage backend
  const storage = createStorage({
    backend: repoConfig.backend,
    connectionString: repoConfig.connectionString,
  });

  // Connect to backend
  await storage.connect();

  // Register cleanup on shutdown
  fastify.addHook("onClose", async () => {
    fastify.log.info("Disconnecting storage backend");
    await storage.disconnect();
  });

  // Decorate Fastify instance with storage
  fastify.decorate("storage", storage);
};

export default fp(storagePlugin, {
  name: "storage",
  dependencies: ["config"],
});

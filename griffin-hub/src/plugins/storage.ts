import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { Storage, JobQueueBackend } from "../storage/index.js";
import { createStorage, createJobQueueBackend } from "../storage/factory.js";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../storage/adapters/postgres/schema.js";

// Extend Fastify's type system to include storage
declare module "fastify" {
  interface FastifyInstance {
    storage: Storage;
    jobQueue: JobQueueBackend;
  }
}

export type DrizzleDatabase = NodePgDatabase<typeof schema>;

/**
 * Fastify plugin that initializes and registers the storage backends.
 * Configuration is loaded from fastify.config (provided by the config plugin).
 */
const storagePlugin: FastifyPluginAsync = async (fastify) => {
  const { repository: repoConfig, jobQueue: queueConfig } = fastify.config;

  fastify.log.info(
    {
      repositoryBackend: repoConfig.backend,
      jobQueueBackend: queueConfig.backend,
    },
    "Initializing storage backends",
  );

  // Create backends
  const storage = createStorage({
    backend: repoConfig.backend,
    connectionString: repoConfig.connectionString,
  });
  const jobQueue = createJobQueueBackend({
    backend: queueConfig.backend,
    connectionString: queueConfig.connectionString,
  });

  // Connect to backends
  await storage.connect();
  await jobQueue.connect();

  // Register cleanup on shutdown
  fastify.addHook("onClose", async () => {
    fastify.log.info("Disconnecting storage backends");
    await Promise.all([storage.disconnect(), jobQueue.disconnect()]);
  });

  // Decorate Fastify instance with backends
  fastify.decorate("storage", storage);
  fastify.decorate("jobQueue", jobQueue);
};

export default fp(storagePlugin, {
  name: "storage",
  dependencies: ["config"],
});

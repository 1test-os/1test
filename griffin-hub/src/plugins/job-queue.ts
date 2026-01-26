import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { JobQueueBackend, createJobQueueBackend } from "../job-queue/index.js";

// Extend Fastify's type system to include job queue
declare module "fastify" {
  interface FastifyInstance {
    jobQueue: JobQueueBackend;
  }
}

/**
 * Fastify plugin that initializes and registers the job queue backend.
 * Configuration is loaded from fastify.config (provided by the config plugin).
 */
const jobQueuePlugin: FastifyPluginAsync = async (fastify) => {
  const queueConfig = fastify.config.jobQueue;

  fastify.log.info(
    {
      jobQueueBackend: queueConfig.backend,
    },
    "Initializing job queue backend",
  );

  // Create job queue backend
  let jobQueue: JobQueueBackend;

  if (queueConfig.backend === "postgres") {
    jobQueue = await createJobQueueBackend({
      backend: "postgres",
      connectionString: queueConfig.connectionString,
    });
  } else if (queueConfig.backend === "sqs") {
    jobQueue = await createJobQueueBackend({
      backend: "sqs",
      queueInfo: queueConfig.queueInfo,
    });
  } else {
    throw new Error(
      `Unknown job queue backend: ${(queueConfig as any).backend}`,
    );
  }

  // Connect to job queue
  await jobQueue.connect();

  // Register cleanup on shutdown
  fastify.addHook("onClose", async () => {
    fastify.log.info("Disconnecting job queue backend");
    await jobQueue.disconnect();
  });

  // Decorate Fastify instance with job queue
  fastify.decorate("jobQueue", jobQueue);
};

export default fp(jobQueuePlugin, {
  name: "job-queue",
  dependencies: ["config"],
});

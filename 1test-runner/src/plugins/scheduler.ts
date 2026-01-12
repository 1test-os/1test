import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { SchedulerService, WorkerService } from "../scheduler/index.js";
import type { HttpClientAdapter } from "1test-plan-executor";

// Extend Fastify's type system to include scheduler
declare module "fastify" {
  interface FastifyInstance {
    scheduler: SchedulerService;
    worker: WorkerService;
  }
}

/**
 * Simple HTTP client adapter for plan execution.
 * Uses native fetch API available in Node.js 18+.
 */
class FetchHttpClient implements HttpClientAdapter {
  async request(req: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeout?: number;
  }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      req.timeout || 30000,
    );

    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body ? JSON.stringify(req.body) : undefined,
        signal: controller.signal,
      });

      const data = await response.text();
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(data);
      } catch {
        parsedData = data;
      }

      return {
        status: response.status,
        statusText: response.statusText,
        data: parsedData,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Fastify plugin that initializes and manages the scheduler and worker services.
 *
 * Configuration via environment variables:
 * - SCHEDULER_TICK_INTERVAL: Milliseconds between scheduler ticks (default: 30000)
 * - WORKER_EMPTY_DELAY: Initial delay when queue is empty (default: 1000)
 * - WORKER_MAX_EMPTY_DELAY: Max delay when queue is empty (default: 30000)
 * - SCHEDULER_ENABLED: Enable/disable scheduler on startup (default: true)
 * - WORKER_ENABLED: Enable/disable worker on startup (default: true)
 */
const schedulerPlugin: FastifyPluginAsync = async (fastify) => {
  const schedulerEnabled = process.env.SCHEDULER_ENABLED !== "false";
  const workerEnabled = process.env.WORKER_ENABLED !== "false";

  fastify.log.info(
    {
      schedulerEnabled,
      workerEnabled,
    },
    "Initializing scheduler and worker services",
  );

  // Create scheduler service
  const scheduler = new SchedulerService(fastify.repository, fastify.jobQueue, {
    tickInterval: process.env.SCHEDULER_TICK_INTERVAL
      ? parseInt(process.env.SCHEDULER_TICK_INTERVAL, 10)
      : 30000,
    backendType: (process.env.REPOSITORY_BACKEND as any) || "memory",
  });

  // Create worker service
  const worker = new WorkerService(fastify.repository, fastify.jobQueue, {
    emptyDelay: process.env.WORKER_EMPTY_DELAY
      ? parseInt(process.env.WORKER_EMPTY_DELAY, 10)
      : 1000,
    maxEmptyDelay: process.env.WORKER_MAX_EMPTY_DELAY
      ? parseInt(process.env.WORKER_MAX_EMPTY_DELAY, 10)
      : 30000,
    httpClient: new FetchHttpClient(),
    baseUrl: process.env.PLAN_EXECUTION_BASE_URL,
    timeout: process.env.PLAN_EXECUTION_TIMEOUT
      ? parseInt(process.env.PLAN_EXECUTION_TIMEOUT, 10)
      : 30000,
  });

  // Start services when server is ready
  fastify.addHook("onReady", async () => {
    if (schedulerEnabled) {
      fastify.log.info("Starting scheduler service");
      scheduler.start();
    }

    if (workerEnabled) {
      fastify.log.info("Starting worker service");
      worker.start();
    }
  });

  // Stop services on shutdown
  fastify.addHook("onClose", async () => {
    fastify.log.info("Stopping scheduler and worker services");
    await Promise.all([scheduler.stop(), worker.stop()]);
  });

  // Decorate Fastify instance
  fastify.decorate("scheduler", scheduler);
  fastify.decorate("worker", worker);
};

export default fp(schedulerPlugin, {
  name: "scheduler",
  dependencies: ["storage"], // Requires storage plugin to be loaded first
});

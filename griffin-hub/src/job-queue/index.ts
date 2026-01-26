/**
 * Job queue module - provides durable background job execution.
 */

export * from "./ports.js";
export * from "./factory.js";
export { PostgresJobQueueBackend } from "./adapters/postgres/index.js";

// SQS adapter is exported for direct use, but typically loaded via factory
export type { SqsQueueInfo } from "./adapters/sqs/index.js";

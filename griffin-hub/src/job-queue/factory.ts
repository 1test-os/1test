import { JobQueueBackend } from "./ports.js";
import { PostgresJobQueueBackend } from "./adapters/postgres/index.js";

// =============================================================================
// Backend types and configs
// =============================================================================

export interface PostgresJobQueueConfig {
  backend: "postgres";
  connectionString: string;
}

export interface SqsJobQueueConfig {
  backend: "sqs";
  queueInfo: Array<{
    region: string;
    url: string;
  }>;
}

export type JobQueueConfig = PostgresJobQueueConfig | SqsJobQueueConfig;

// =============================================================================
// Factory function
// =============================================================================

/**
 * Create a job queue backend based on configuration.
 */
export async function createJobQueueBackend(
  config: JobQueueConfig,
): Promise<JobQueueBackend> {
  switch (config.backend) {
    case "postgres":
      return new PostgresJobQueueBackend(config.connectionString);

    case "sqs":
      // Import SQS adapter dynamically to avoid forcing AWS SDK dependency
      const module = await import("./adapters/sqs/index.js");
      return new module.SqsJobQueueBackend(config.queueInfo);

    default:
      throw new Error(`Unknown job queue backend: ${(config as any).backend}`);
  }
}

import type { QueueConsumer, Job, ExecutionJobData } from "./types.js";
/**
 * PostgreSQL queue consumer implementation for agents.
 * Uses SELECT FOR UPDATE SKIP LOCKED for safe concurrent job consumption.
 */
export declare class PostgresQueueConsumer implements QueueConsumer {
    private connectionString;
    private queueName;
    private pool;
    constructor(connectionString: string, queueName?: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    poll(location: string): Promise<Job<ExecutionJobData> | null>;
    acknowledge(jobId: string): Promise<void>;
    fail(jobId: string, error: Error, retry?: boolean): Promise<void>;
}
//# sourceMappingURL=postgres-consumer.d.ts.map
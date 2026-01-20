import { JobQueue, Job, JobStatus, EnqueueOptions } from "../../ports.js";
import { Pool } from "pg";
import { randomUUID } from "crypto";

/**
 * PostgreSQL implementation of JobQueue.
 *
 * Uses a 'jobs' table with:
 * - SELECT FOR UPDATE SKIP LOCKED for safe concurrent dequeue
 * - Index on (status, scheduledFor, priority) for efficient queries
 * - Support for named queues via 'queue_name' column
 */
export class PostgresJobQueue<T = any> implements JobQueue<T> {
  constructor(
    private pool: Pool,
    private queueName: string = "default",
  ) {}

  async enqueue(data: T, options: EnqueueOptions): Promise<string> {
    const id = randomUUID();
    const scheduledFor = options.runAt || new Date();
    const priority = options.priority ?? 0;
    const maxAttempts = options.maxAttempts ?? 3;

    const query = `
      INSERT INTO jobs (
        id, queue_name, data, location, status, attempts, max_attempts,
        priority, scheduled_for, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id
    `;

    const params = [
      id,
      this.queueName,
      JSON.stringify(data),
      options.location,
      JobStatus.PENDING,
      0,
      maxAttempts,
      priority,
      scheduledFor,
    ];

    const result = await this.pool.query(query, params);
    return result.rows[0].id;
  }

  async dequeue(location?: string): Promise<Job<T> | null> {
    // Use SELECT FOR UPDATE SKIP LOCKED for safe concurrent access
    let query = `
      UPDATE jobs
      SET status = $1, started_at = NOW(), attempts = attempts + 1, updated_at = NOW()
      WHERE id = (
        SELECT id FROM jobs
        WHERE queue_name = $2
          AND status = $3
          AND scheduled_for <= NOW()
          ${location ? "AND location = $4" : ""}
        ORDER BY priority DESC, scheduled_for ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, data, location, status, attempts, max_attempts, priority,
                scheduled_for as "scheduledFor", created_at as "createdAt",
                started_at as "startedAt", completed_at as "completedAt", error
    `;

    const params = location
      ? [JobStatus.RUNNING, this.queueName, JobStatus.PENDING, location]
      : [JobStatus.RUNNING, this.queueName, JobStatus.PENDING];

    const result = await this.pool.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      data: row.data as T,
      location: row.location,
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      priority: row.priority,
      scheduledFor: row.scheduledFor,
      createdAt: row.createdAt,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      error: row.error,
    };
  }

  async acknowledge(jobId: string): Promise<void> {
    const query = `
      UPDATE jobs
      SET status = $1, completed_at = NOW(), updated_at = NOW()
      WHERE id = $2
    `;

    await this.pool.query(query, [JobStatus.COMPLETED, jobId]);
  }

  async fail(
    jobId: string,
    error: Error,
    retry: boolean = true,
  ): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const shouldRetry = retry && job.attempts < job.maxAttempts;
    const newStatus = shouldRetry ? JobStatus.RETRYING : JobStatus.FAILED;

    let query: string;
    let params: unknown[];

    if (shouldRetry) {
      // Calculate exponential backoff: 2^attempts seconds
      const backoffSeconds = Math.pow(2, job.attempts);
      const nextRunAt = new Date(Date.now() + backoffSeconds * 1000);

      query = `
        UPDATE jobs
        SET status = $1, error = $2, scheduled_for = $3, updated_at = NOW()
        WHERE id = $4
      `;
      params = [newStatus, error.message, nextRunAt, jobId];
    } else {
      query = `
        UPDATE jobs
        SET status = $1, error = $2, completed_at = NOW(), updated_at = NOW()
        WHERE id = $3
      `;
      params = [newStatus, error.message, jobId];
    }

    await this.pool.query(query, params);

    // If retrying, reset status to PENDING
    if (shouldRetry) {
      await this.pool.query("UPDATE jobs SET status = $1 WHERE id = $2", [
        JobStatus.PENDING,
        jobId,
      ]);
    }
  }

  async getStatus(jobId: string): Promise<JobStatus | null> {
    const query = "SELECT status FROM jobs WHERE id = $1";
    const result = await this.pool.query(query, [jobId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].status as JobStatus;
  }

  async getJob(jobId: string): Promise<Job<T> | null> {
    const query = `
      SELECT id, data, location, status, attempts, max_attempts, priority,
             scheduled_for as "scheduledFor", created_at as "createdAt",
             started_at as "startedAt", completed_at as "completedAt", error
      FROM jobs
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [jobId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      data: row.data as T,
      location: row.location,
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      priority: row.priority,
      scheduledFor: row.scheduledFor,
      createdAt: row.createdAt,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      error: row.error,
    };
  }
}

import { JobQueue, Job, JobStatus, EnqueueOptions } from '../../ports.js';

/**
 * SQLite implementation of JobQueue.
 * 
 * TODO: Implement using a 'jobs' table with:
 * - Row-level locking for dequeue (SKIP LOCKED pattern)
 * - Exponential backoff for retries
 * - Index on (status, scheduledFor, priority) for efficient dequeue
 * 
 * Consider using or learning from: pg-boss approach but for SQLite
 */
export class SqliteJobQueue<T = any> implements JobQueue<T> {
  constructor(private db: any) {} // TODO: Type this as Database from better-sqlite3

  async enqueue(data: T, options?: EnqueueOptions): Promise<string> {
    throw new Error('SqliteJobQueue.enqueue not yet implemented');
  }

  async dequeue(): Promise<Job<T> | null> {
    throw new Error('SqliteJobQueue.dequeue not yet implemented');
  }

  async acknowledge(jobId: string): Promise<void> {
    throw new Error('SqliteJobQueue.acknowledge not yet implemented');
  }

  async fail(jobId: string, error: Error, retry?: boolean): Promise<void> {
    throw new Error('SqliteJobQueue.fail not yet implemented');
  }

  async getStatus(jobId: string): Promise<JobStatus | null> {
    throw new Error('SqliteJobQueue.getStatus not yet implemented');
  }

  async getJob(jobId: string): Promise<Job<T> | null> {
    throw new Error('SqliteJobQueue.getJob not yet implemented');
  }
}

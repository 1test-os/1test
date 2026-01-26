/**
 * Core job queue abstractions (ports).
 * These interfaces define the contract that all job queue adapters must implement.
 */

export enum JobStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  RETRYING = "retrying",
}

export interface Job<T> {
  id: string;
  data: T;
  location: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  priority: number;
  scheduledFor: Date;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface EnqueueOptions {
  /**
   * Location identifier for routing the job to specific agents.
   * Required for multi-location execution.
   */
  location: string;

  /**
   * When the job should be executed. Defaults to now.
   */
  runAt?: Date;

  /**
   * Priority (higher = more important). Defaults to 0.
   */
  priority?: number;

  /**
   * Maximum number of retry attempts. Defaults to 3.
   */
  maxAttempts?: number;
}

/**
 * Durable job queue for background task execution.
 */
export interface JobQueue<T = any> {
  /**
   * Add a job to the queue.
   * Returns the job ID.
   */
  enqueue(data: T, options: EnqueueOptions): Promise<string>;

  /**
   * Get the next job to process.
   * Returns null if no jobs are available.
   * Automatically marks the job as RUNNING.
   *
   * @param location - Optional location filter. If provided, only returns jobs for that location.
   */
  dequeue(location?: string): Promise<Job<T> | null>;

  /**
   * Mark a job as successfully completed.
   */
  acknowledge(jobId: string): Promise<void>;

  /**
   * Mark a job as failed.
   * If retry is true and attempts < maxAttempts, the job will be retried.
   */
  fail(jobId: string, error: Error, retry?: boolean): Promise<void>;

  /**
   * Get the current status of a job.
   */
  getStatus(jobId: string): Promise<JobStatus | null>;

  /**
   * Get a job by ID.
   */
  getJob(jobId: string): Promise<Job<T> | null>;
}

/**
 * Job queue backend interface.
 * Provides access to background job queues.
 */
export interface JobQueueBackend {
  /**
   * Get a job queue for background task execution.
   * Optional name parameter allows for multiple named queues.
   */
  queue<T = any>(name?: string): JobQueue<T>;

  /**
   * Connect to the job queue backend.
   * Should be called before using queues.
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the job queue backend.
   */
  disconnect(): Promise<void>;
}

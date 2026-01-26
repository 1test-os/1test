import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message,
  MessageAttributeValue,
} from "@aws-sdk/client-sqs";
import { JobQueue, Job, JobStatus, EnqueueOptions } from "../../ports.js";
import { randomUUID } from "crypto";

interface SqsJobMetadata {
  id: string;
  location: string;
  attempts: number;
  maxAttempts: number;
  priority: number;
  scheduledFor: string; // ISO 8601
  createdAt: string; // ISO 8601
  startedAt?: string; // ISO 8601
}

interface InFlightJob {
  job: Job<any>;
  receiptHandle: string;
}

/**
 * AWS SQS implementation of JobQueue.
 *
 * Notes:
 * - Uses SQS message attributes for job metadata
 * - Visibility timeout acts as the "running" state
 * - Priority is simulated (SQS FIFO supports message groups, but standard doesn't have native priority)
 * - getStatus() and getJob() have limited functionality (can only track in-flight jobs)
 * - For full job tracking, consider using a separate metadata store (DynamoDB, Redis, etc.)
 */
export class SqsJobQueue<T = any> implements JobQueue<T> {
  private inFlightJobs: Map<string, InFlightJob> = new Map();

  constructor(
    private client: SQSClient,
    private queueUrl: string,
  ) {}

  async enqueue(data: T, options: EnqueueOptions): Promise<string> {
    const jobId = randomUUID();
    const now = new Date();
    const scheduledFor = options.runAt || now;
    const priority = options.priority ?? 0;
    const maxAttempts = options.maxAttempts ?? 3;

    // Calculate delay in seconds (SQS supports up to 900 seconds = 15 minutes)
    const delaySeconds = Math.max(
      0,
      Math.min(
        900,
        Math.floor((scheduledFor.getTime() - now.getTime()) / 1000),
      ),
    );

    const metadata: SqsJobMetadata = {
      id: jobId,
      location: options.location,
      attempts: 0,
      maxAttempts,
      priority,
      scheduledFor: scheduledFor.toISOString(),
      createdAt: now.toISOString(),
    };

    const messageAttributes: Record<string, MessageAttributeValue> = {
      jobId: { DataType: "String", StringValue: jobId },
      location: { DataType: "String", StringValue: options.location },
      attempts: { DataType: "Number", StringValue: "0" },
      maxAttempts: { DataType: "Number", StringValue: String(maxAttempts) },
      priority: { DataType: "Number", StringValue: String(priority) },
      scheduledFor: { DataType: "String", StringValue: scheduledFor.toISOString() },
      createdAt: { DataType: "String", StringValue: now.toISOString() },
    };

    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify({ metadata, data }),
        MessageAttributes: messageAttributes,
        DelaySeconds: delaySeconds,
      }),
    );

    return jobId;
  }

  async dequeue(location?: string): Promise<Job<T> | null> {
    // Receive message with long polling (20 seconds max)
    const response = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 20,
        MessageAttributeNames: ["All"],
        VisibilityTimeout: 300, // 5 minutes default
      }),
    );

    if (!response.Messages || response.Messages.length === 0) {
      return null;
    }

    const message = response.Messages[0];
    const body = JSON.parse(message.Body || "{}");
    const metadata: SqsJobMetadata = body.metadata;
    const data: T = body.data;

    // Filter by location if specified
    if (location && metadata.location !== location) {
      // Return message to queue by not deleting it
      // Visibility timeout will expire and it will be available again
      return null;
    }

    // Increment attempts
    const attempts = metadata.attempts + 1;
    const startedAt = new Date();

    const job: Job<T> = {
      id: metadata.id,
      data,
      location: metadata.location,
      status: JobStatus.RUNNING,
      attempts,
      maxAttempts: metadata.maxAttempts,
      priority: metadata.priority,
      scheduledFor: new Date(metadata.scheduledFor),
      createdAt: new Date(metadata.createdAt),
      startedAt,
    };

    // Track in-flight job for later acknowledgment/failure
    this.inFlightJobs.set(metadata.id, {
      job: {
        ...job,
        attempts, // Updated attempts count
      },
      receiptHandle: message.ReceiptHandle!,
    });

    return job;
  }

  async acknowledge(jobId: string): Promise<void> {
    const inFlight = this.inFlightJobs.get(jobId);
    if (!inFlight) {
      throw new Error(
        `Job ${jobId} not found in in-flight jobs. Cannot acknowledge.`,
      );
    }

    // Delete message from queue
    await this.client.send(
      new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: inFlight.receiptHandle,
      }),
    );

    // Remove from in-flight tracking
    this.inFlightJobs.delete(jobId);
  }

  async fail(
    jobId: string,
    error: Error,
    retry: boolean = true,
  ): Promise<void> {
    const inFlight = this.inFlightJobs.get(jobId);
    if (!inFlight) {
      throw new Error(
        `Job ${jobId} not found in in-flight jobs. Cannot mark as failed.`,
      );
    }

    const job = inFlight.job;
    const shouldRetry = retry && job.attempts < job.maxAttempts;

    // Always delete the current message
    await this.client.send(
      new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: inFlight.receiptHandle,
      }),
    );

    if (shouldRetry) {
      // Re-enqueue with exponential backoff delay
      const backoffSeconds = Math.min(900, Math.pow(2, job.attempts));
      const nextRunAt = new Date(Date.now() + backoffSeconds * 1000);

      // Create new message with incremented attempts
      const metadata: SqsJobMetadata = {
        id: job.id,
        location: job.location,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        priority: job.priority,
        scheduledFor: nextRunAt.toISOString(),
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString(),
      };

      const messageAttributes: Record<string, MessageAttributeValue> = {
        jobId: { DataType: "String", StringValue: job.id },
        location: { DataType: "String", StringValue: job.location },
        attempts: { DataType: "Number", StringValue: String(job.attempts) },
        maxAttempts: { DataType: "Number", StringValue: String(job.maxAttempts) },
        priority: { DataType: "Number", StringValue: String(job.priority) },
        scheduledFor: { DataType: "String", StringValue: nextRunAt.toISOString() },
        createdAt: { DataType: "String", StringValue: job.createdAt.toISOString() },
        error: { DataType: "String", StringValue: error.message },
      };

      await this.client.send(
        new SendMessageCommand({
          QueueUrl: this.queueUrl,
          MessageBody: JSON.stringify({ metadata, data: job.data }),
          MessageAttributes: messageAttributes,
          DelaySeconds: backoffSeconds,
        }),
      );
    }

    // Remove from in-flight tracking
    this.inFlightJobs.delete(jobId);
  }

  async getStatus(jobId: string): Promise<JobStatus | null> {
    // SQS doesn't support querying by job ID
    // We can only check in-flight jobs
    const inFlight = this.inFlightJobs.get(jobId);
    if (inFlight) {
      return JobStatus.RUNNING;
    }

    // For completed/failed/pending jobs, we don't have visibility in SQS
    // Would need a separate metadata store (DynamoDB, Redis, etc.)
    return null;
  }

  async getJob(jobId: string): Promise<Job<T> | null> {
    // Similar limitation as getStatus
    // Can only return in-flight jobs
    const inFlight = this.inFlightJobs.get(jobId);
    if (inFlight) {
      return inFlight.job;
    }

    return null;
  }
}

import { SQSClient } from "@aws-sdk/client-sqs";
import { JobQueueBackend, JobQueue } from "../../ports.js";
import { SqsJobQueue } from "./job-queue.js";

export interface SqsQueueInfo {
  region: string;
  url: string;
}

/**
 * AWS SQS job queue backend.
 * Supports multiple queues across different regions.
 *
 * Configuration notes:
 * - Each queue can be in a different AWS region
 * - Queue URL format: https://sqs.{region}.amazonaws.com/{account-id}/{queue-name}
 * - AWS credentials are loaded from environment (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 *   or IAM roles (recommended for production)
 * - Supports standard and FIFO queues
 *
 * Limitations:
 * - Priority is not natively supported (consider using multiple queues or FIFO message groups)
 */
export class SqsJobQueueBackend implements JobQueueBackend {
  private clients: Map<string, SQSClient> = new Map();
  private queues: Map<string, SqsJobQueue<any>> = new Map();
  private queueUrlsByName: Map<string, string> = new Map();

  constructor(private queueInfo: SqsQueueInfo[]) {
    // Validate queue info
    if (!queueInfo || queueInfo.length === 0) {
      throw new Error("At least one queue must be configured for SQS backend");
    }

    // Create SQS clients per region
    for (const info of queueInfo) {
      if (!this.clients.has(info.region)) {
        this.clients.set(info.region, new SQSClient({ region: info.region }));
      }

      // Extract queue name from URL
      // Format: https://sqs.{region}.amazonaws.com/{account-id}/{queue-name}
      const queueName = info.url.split("/").pop() || "default";
      this.queueUrlsByName.set(queueName, info.url);
    }
  }

  queue<T = any>(name: string = "default"): JobQueue<T> {
    if (!this.queues.has(name)) {
      const queueUrl = this.queueUrlsByName.get(name);
      if (!queueUrl) {
        throw new Error(
          `Queue '${name}' not configured. Available queues: ${Array.from(this.queueUrlsByName.keys()).join(", ")}`,
        );
      }

      // Extract region from queue URL
      const region = queueUrl.match(/sqs\.([^.]+)\.amazonaws\.com/)?.[1];
      if (!region) {
        throw new Error(`Could not extract region from queue URL: ${queueUrl}`);
      }

      const client = this.clients.get(region);
      if (!client) {
        throw new Error(`SQS client not found for region: ${region}`);
      }

      this.queues.set(name, new SqsJobQueue<T>(client, queueUrl));
    }

    return this.queues.get(name)!;
  }

  async connect(): Promise<void> {
    // SQS doesn't require explicit connection
    // Clients are ready to use immediately
  }

  async disconnect(): Promise<void> {
    // Clean up SQS clients
    for (const client of this.clients.values()) {
      client.destroy();
    }
    this.clients.clear();
    this.queues.clear();
  }
}

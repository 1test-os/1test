import { JobQueueBackend, JobQueue } from "../../ports.js";
import { PostgresJobQueue } from "./job-queue.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../../storage/adapters/postgres/schema.js";
import { DrizzleDatabase } from "../../../plugins/storage.js";

/**
 * PostgreSQL job queue backend.
 * Provides high-performance, durable job queues using Postgres.
 *
 * Connection options to consider:
 * - Connection string from environment variable
 * - Pool configuration (max connections, idle timeout, etc.)
 * - SSL settings for production
 * - Statement timeout for safety
 */
export class PostgresJobQueueBackend implements JobQueueBackend {
  private pool: Pool | null = null;
  private db: DrizzleDatabase | null = null;
  private queues: Map<string, PostgresJobQueue<any>> = new Map();

  constructor(private connectionString: string) {}

  queue<T = any>(name: string = "default"): JobQueue<T> {
    if (!this.queues.has(name)) {
      if (!this.db) {
        throw new Error("Job queue backend not connected");
      }
      this.queues.set(name, new PostgresJobQueue<T>(this.db, name));
    }
    return this.queues.get(name)!;
  }

  async connect(): Promise<void> {
    // Create pool with UTC timezone setting
    this.pool = new Pool({
      connectionString: this.connectionString,
      // Set timezone to UTC for all connections
      options: "-c timezone=UTC",
    });
    this.db = drizzle(this.pool, { schema });
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.db = null;
    }
  }
}

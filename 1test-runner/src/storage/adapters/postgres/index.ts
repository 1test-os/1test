import { StorageBackend, Repository, JobQueue } from '../../ports.js';
import { PostgresRepository } from './repository.js';
import { PostgresJobQueue } from './job-queue.js';

/**
 * PostgreSQL storage backend.
 * 
 * TODO: Implement using 'pg' (node-postgres)
 * 
 * Connection options to consider:
 * - Connection string from environment variable
 * - Pool configuration (max connections, idle timeout, etc.)
 * - SSL settings for production
 * - Statement timeout for safety
 * 
 * You already have a Pool setup in astro-runner-old/src/database.ts
 * that can be used as a reference.
 */
export class PostgresStorage implements StorageBackend {
  private pool: any; // TODO: Type this as Pool from 'pg'
  private repositories: Map<string, PostgresRepository<any>> = new Map();
  private jobQueue: PostgresJobQueue | null = null;

  constructor(private connectionString: string) {}

  repository<T extends { id: string }>(collection: string): Repository<T> {
    if (!this.repositories.has(collection)) {
      this.repositories.set(collection, new PostgresRepository<T>(this.pool, collection));
    }
    return this.repositories.get(collection)!;
  }

  queue<T = any>(): JobQueue<T> {
    if (!this.jobQueue) {
      this.jobQueue = new PostgresJobQueue<T>(this.pool);
    }
    return this.jobQueue as JobQueue<T>;
  }

  async connect(): Promise<void> {
    throw new Error('PostgresStorage.connect not yet implemented');
    // TODO:
    // const { Pool } = require('pg');
    // this.pool = new Pool({ connectionString: this.connectionString });
    // await this.pool.query('SELECT NOW()'); // Test connection
  }

  async disconnect(): Promise<void> {
    throw new Error('PostgresStorage.disconnect not yet implemented');
    // TODO:
    // if (this.pool) {
    //   await this.pool.end();
    // }
  }

  async transaction<R>(fn: (tx: StorageBackend) => Promise<R>): Promise<R> {
    throw new Error('PostgresStorage.transaction not yet implemented');
    // TODO: Get a client from pool, BEGIN/COMMIT/ROLLBACK
    // Create a transactional StorageBackend that uses the same client
    // Pass it to fn()
  }
}

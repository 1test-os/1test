import { StorageBackend, Repository, JobQueue } from '../../ports.js';
import { SqliteRepository } from './repository.js';
import { SqliteJobQueue } from './job-queue.js';

/**
 * SQLite storage backend.
 * 
 * TODO: Implement using better-sqlite3 (sync) or sql.js (async)
 * 
 * Recommended: better-sqlite3
 * - Much faster than async alternatives
 * - Simpler API (no callback/promise overhead)
 * - Works great for single-node deployments
 * - Enable WAL mode for better concurrency: PRAGMA journal_mode=WAL
 * 
 * Connection options to consider:
 * - File path or ':memory:' for in-memory DB
 * - Enable foreign keys: PRAGMA foreign_keys=ON
 * - Set busy timeout for lock handling
 */
export class SqliteStorage implements StorageBackend {
  private db: any; // TODO: Type this as Database from better-sqlite3
  private repositories: Map<string, SqliteRepository<any>> = new Map();
  private jobQueue: SqliteJobQueue | null = null;

  constructor(private dbPath: string = ':memory:') {}

  repository<T extends { id: string }>(collection: string): Repository<T> {
    if (!this.repositories.has(collection)) {
      this.repositories.set(collection, new SqliteRepository<T>(this.db, collection));
    }
    return this.repositories.get(collection)!;
  }

  queue<T = any>(): JobQueue<T> {
    if (!this.jobQueue) {
      this.jobQueue = new SqliteJobQueue<T>(this.db);
    }
    return this.jobQueue as JobQueue<T>;
  }

  async connect(): Promise<void> {
    throw new Error('SqliteStorage.connect not yet implemented');
    // TODO:
    // const Database = require('better-sqlite3');
    // this.db = new Database(this.dbPath);
    // this.db.pragma('journal_mode = WAL');
    // this.db.pragma('foreign_keys = ON');
  }

  async disconnect(): Promise<void> {
    throw new Error('SqliteStorage.disconnect not yet implemented');
    // TODO:
    // if (this.db) {
    //   this.db.close();
    // }
  }

  async transaction<R>(fn: (tx: StorageBackend) => Promise<R>): Promise<R> {
    throw new Error('SqliteStorage.transaction not yet implemented');
    // TODO: Wrap in BEGIN/COMMIT/ROLLBACK
    // better-sqlite3 has: db.transaction(() => { ... })
  }
}

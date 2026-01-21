import { Storage } from "../../repositories.js";
import {
  SqlitePlansRepository,
  SqliteRunsRepository,
  SqliteAgentsRepository,
} from "./repositories.js";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import * as schema from "./schema.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

/**
 * SQLite Storage implementation using Drizzle ORM and better-sqlite3.
 *
 * Note: SQLite is NOT suitable for job queues due to lack of proper row-level
 * locking (SELECT FOR UPDATE SKIP LOCKED). Use Postgres job queue instead.
 *
 * Features:
 * - WAL mode enabled for better concurrency
 * - Foreign keys enforced
 * - Full transaction support
 * - Suitable for single-node deployments
 */
export class SqliteStorage implements Storage {
  private sqlite: Database.Database | null = null;
  private db: BetterSQLite3Database<typeof schema> | null = null;

  public plans!: SqlitePlansRepository;
  public runs!: SqliteRunsRepository;
  public agents!: SqliteAgentsRepository;

  constructor(private dbPath: string = ":memory:") {}

  async connect(): Promise<void> {
    // Create the SQLite database connection
    this.sqlite = new Database(this.dbPath);

    // Enable WAL mode for better concurrency
    this.sqlite.pragma("journal_mode = WAL");

    // Enable foreign keys
    this.sqlite.pragma("foreign_keys = ON");

    // Set busy timeout to handle concurrent writes
    this.sqlite.pragma("busy_timeout = 5000");

    // Create Drizzle database instance
    this.db = drizzle(this.sqlite, { schema });

    // Run migrations
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const migrationsFolder = join(__dirname, "migrations");
    await migrate(this.db, { migrationsFolder });

    // Initialize repositories
    this.plans = new SqlitePlansRepository(this.db);
    this.runs = new SqliteRunsRepository(this.db);
    this.agents = new SqliteAgentsRepository(this.db);
  }

  async disconnect(): Promise<void> {
    if (this.sqlite) {
      this.sqlite.close();
      this.sqlite = null;
      this.db = null;
    }
  }

  async transaction<R>(fn: (tx: Storage) => Promise<R>): Promise<R> {
    if (!this.db) {
      throw new Error("Database not initialized. Call connect() first.");
    }

    return await this.db.transaction(async (tx) => {
      // Create a transactional storage instance
      const txStorage = new SqliteTransactionStorage(tx);
      return await fn(txStorage);
    });
  }
}

/**
 * Transaction-scoped SQLite storage.
 * Uses a single transaction context for all operations.
 */
class SqliteTransactionStorage implements Storage {
  public plans: SqlitePlansRepository;
  public runs: SqliteRunsRepository;
  public agents: SqliteAgentsRepository;

  constructor(private tx: BetterSQLite3Database<typeof schema>) {
    this.plans = new SqlitePlansRepository(tx);
    this.runs = new SqliteRunsRepository(tx);
    this.agents = new SqliteAgentsRepository(tx);
  }

  async connect(): Promise<void> {
    // No-op: already connected via transaction
  }

  async disconnect(): Promise<void> {
    // No-op: transaction is managed by parent
  }

  async transaction<R>(fn: (tx: Storage) => Promise<R>): Promise<R> {
    // Nested transactions: just execute with current transaction context
    // SQLite supports SAVEPOINT but drizzle handles this automatically
    return await fn(this);
  }
}

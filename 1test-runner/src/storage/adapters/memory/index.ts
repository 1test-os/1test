import { StorageBackend, Repository, JobQueue } from '../../ports.js';
import { MemoryRepository } from './repository.js';
import { MemoryJobQueue } from './job-queue.js';

/**
 * In-memory storage backend.
 * All data is stored in memory and lost when the process exits.
 * Perfect for testing and development.
 */
export class MemoryStorage implements StorageBackend {
  private repositories: Map<string, MemoryRepository<any>> = new Map();
  private jobQueue: MemoryJobQueue = new MemoryJobQueue();

  repository<T extends { id: string }>(collection: string): Repository<T> {
    if (!this.repositories.has(collection)) {
      this.repositories.set(collection, new MemoryRepository<T>());
    }
    return this.repositories.get(collection)!;
  }

  queue<T = any>(): JobQueue<T> {
    return this.jobQueue;
  }

  async connect(): Promise<void> {
    // No-op for memory storage
  }

  async disconnect(): Promise<void> {
    // No-op for memory storage
  }

  async transaction<R>(fn: (tx: StorageBackend) => Promise<R>): Promise<R> {
    // For memory storage, we don't have real transactions
    // Just execute the function directly
    // In a real implementation, you'd clone the data and rollback on error
    return fn(this);
  }

  /**
   * Clear all data (useful for testing).
   */
  clear(): void {
    for (const repo of this.repositories.values()) {
      repo.clear();
    }
    this.jobQueue.clear();
  }
}

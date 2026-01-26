/**
 * Core storage abstractions (ports) for the application.
 * These interfaces define the contract that all storage adapters must implement.
 */

// =============================================================================
// Migrations
// =============================================================================

export interface Migration {
  version: string;
  name: string;
  up: (adapter: any) => Promise<void>;
  down: (adapter: any) => Promise<void>;
}

export interface MigrationRunner {
  /**
   * Run all pending migrations.
   */
  migrate(): Promise<void>;

  /**
   * Rollback the last N migrations.
   */
  rollback(count?: number): Promise<void>;

  /**
   * Get the current migration version.
   */
  version(): Promise<string | null>;

  /**
   * Get list of applied migrations.
   */
  applied(): Promise<string[]>;
}

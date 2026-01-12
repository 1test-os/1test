# Storage Module

This module provides a unified interface for persistent storage across different backends. It follows the **Ports & Adapters** (Hexagonal Architecture) pattern to allow swapping storage implementations without changing business logic.

## Architecture

```
storage/
  ├── ports.ts                    # Core interfaces (contracts)
  ├── factory.ts                  # Creates storage backends
  ├── index.ts                    # Public API exports
  └── adapters/                   # Storage implementations
      ├── memory/                 # ✅ In-memory (complete)
      │   ├── index.ts
      │   ├── repository.ts
      │   └── job-queue.ts
      ├── sqlite/                 # 🚧 SQLite (stub)
      │   ├── index.ts
      │   ├── repository.ts
      │   ├── job-queue.ts
      │   └── migrations/
      │       └── runner.ts
      └── postgres/               # 🚧 PostgreSQL (stub)
          ├── index.ts
          ├── repository.ts
          ├── job-queue.ts
          └── migrations/
              └── runner.ts
```

## Core Concepts

### 1. Repository<T>
Generic CRUD interface for entities with an `id` field.

```typescript
interface Repository<T extends { id: string }> {
  create(data: Omit<T, 'id'>): Promise<T>;
  findById(id: string): Promise<T | null>;
  findMany(options?: QueryOptions<T>): Promise<T[]>;
  update(id: string, data: Partial<Omit<T, 'id'>>): Promise<T>;
  delete(id: string): Promise<void>;
  count(filter?: Filter<T>): Promise<number>;
}
```

### 2. JobQueue<T>
Durable background job queue with retry logic.

```typescript
interface JobQueue<T> {
  enqueue(data: T, options?: EnqueueOptions): Promise<string>;
  dequeue(): Promise<Job<T> | null>;
  acknowledge(jobId: string): Promise<void>;
  fail(jobId: string, error: Error, retry?: boolean): Promise<void>;
}
```

### 3. StorageBackend
Main interface providing repositories and job queues.

```typescript
interface StorageBackend {
  repository<T extends { id: string }>(collection: string): Repository<T>;
  queue<T>(): JobQueue<T>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  transaction<R>(fn: (tx: StorageBackend) => Promise<R>): Promise<R>;
}
```

## Usage

### In Routes

```typescript
// routes/plan/index.ts
export default function (fastify: FastifyTypeBox) {
  fastify.post('/plan', { schema: CreatePlanEndpoint }, async (request, reply) => {
    const planRepo = fastify.storage.repository<TestPlanV1>('plans');
    const savedPlan = await planRepo.create(request.body);
    return reply.code(201).send(savedPlan);
  });

  fastify.get('/plan/:id', async (request, reply) => {
    const planRepo = fastify.storage.repository<TestPlanV1>('plans');
    const plan = await planRepo.findById(request.params.id);
    
    if (!plan) {
      return reply.code(404).send({ error: 'Plan not found' });
    }
    
    return reply.send(plan);
  });
}
```

### In Background Jobs

```typescript
// Enqueue a job
const queue = fastify.storage.queue<ExecutePlanJob>();
await queue.enqueue(
  { planId: 'plan-123', executionId: 'exec-456' },
  { runAt: new Date(Date.now() + 60000) } // Run in 1 minute
);

// Process jobs
async function processJobs() {
  const queue = fastify.storage.queue<ExecutePlanJob>();
  
  while (true) {
    const job = await queue.dequeue();
    if (!job) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }
    
    try {
      await executePlan(job.data);
      await queue.acknowledge(job.id);
    } catch (error) {
      await queue.fail(job.id, error, true); // Retry on failure
    }
  }
}
```

## Configuration

Storage backend is configured via environment variables:

```bash
# Use in-memory storage (default, good for dev/testing)
STORAGE_BACKEND=memory

# Use SQLite (good for single-node production)
STORAGE_BACKEND=sqlite
SQLITE_PATH=/var/lib/astro/astro.db  # or ':memory:'

# Use PostgreSQL (good for multi-node production)
STORAGE_BACKEND=postgres
POSTGRESQL_URL=postgresql://user:pass@localhost:5432/astro
```

## Backends

### ✅ In-Memory (Complete)

Fully functional implementation for testing and development.

**Pros:**
- No external dependencies
- Fast
- Perfect for tests

**Cons:**
- Data lost on restart
- Not suitable for production

### 🚧 SQLite (Stub)

**When to use:**
- Single-node deployments
- Simple setup requirements
- File-based persistence needed

**Recommended library:** `better-sqlite3`

**TODO:**
- Implement repository with JSON serialization
- Implement job queue with row-level locking
- Create migration runner
- Add migrations for plans and jobs tables

### 🚧 PostgreSQL (Stub)

**When to use:**
- Multi-node deployments
- Existing PostgreSQL infrastructure
- Need for advanced querying

**Recommended library:** `pg` (node-postgres)

**TODO:**
- Implement repository with JSONB storage
- Implement job queue with `SELECT FOR UPDATE SKIP LOCKED`
- Create migration runner
- Add migrations for plans and jobs tables

## Design Decisions

### Why Generic Repository?

Without generics, you'd need:
```typescript
interface PlanRepository { ... }
interface ExecutionRepository { ... }
interface LogRepository { ... }
```

With generics, you get one interface for all entities:
```typescript
Repository<Plan>
Repository<Execution>
Repository<Log>
```

### Why Separate Migrations?

TypeBox schemas define **API contracts** (validation, types).  
Migrations define **database structure** (tables, columns, indexes).

These are separate concerns:
- Schemas change when your API changes
- Migrations change when your storage needs change
- They don't always align (e.g., you might denormalize for performance)

### Why Same Storage for Jobs and Data?

**Pros:**
- Simpler infrastructure (one database instead of two)
- Transactional consistency (create plan + enqueue job atomically)
- Easier to reason about

**Cons:**
- A dedicated queue (Redis, RabbitMQ) has higher throughput
- For test execution (I/O-bound), this won't be a bottleneck

## Testing

The in-memory adapter is perfect for testing:

```typescript
import { MemoryStorage } from './storage';

describe('Plan Routes', () => {
  let storage: MemoryStorage;
  
  beforeEach(() => {
    storage = new MemoryStorage();
    await storage.connect();
  });
  
  afterEach(async () => {
    await storage.disconnect();
  });
  
  it('should create a plan', async () => {
    const repo = storage.repository<TestPlanV1>('plans');
    const plan = await repo.create({ name: 'Test Plan', ... });
    expect(plan.id).toBeDefined();
  });
});
```

## Future Enhancements

1. **Query Builder**: Add a fluent API for complex queries
2. **Migrations**: Implement migration runners for SQLite/Postgres
3. **Indexes**: Add support for declaring indexes on repositories
4. **Caching**: Add optional caching layer for frequently-accessed data
5. **Observability**: Add metrics for repository/queue operations

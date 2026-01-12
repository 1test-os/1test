/**
 * Example usage of the storage system.
 * This file demonstrates how to use repositories and job queues.
 */

import { createStorage } from './factory.js';
import type { TestPlanV1 } from '../schemas/plan.js';

// Example entity for executions
interface Execution {
  id: string;
  planId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  results?: any;
}

// Example job data for plan execution
interface ExecutePlanJob {
  planId: string;
  executionId: string;
}

async function exampleUsage() {
  // 1. Create and connect storage
  const storage = createStorage({ backend: 'memory' });
  await storage.connect();

  // 2. Get repositories
  const planRepo = storage.repository<TestPlanV1>('plans');
  const executionRepo = storage.repository<Execution>('executions');

  // 3. Create some data
  const plan = await planRepo.create({
    name: 'API Health Check',
    version: '1.0',
    endpoint_host: 'https://api.example.com',
    nodes: [
      {
        id: 'node-1',
        type: 0, // NodeType.ENDPOINT
        data: {
          method: 0, // HttpMethod.GET
          path: '/health',
          response_format: 0, // ResponseFormat.JSON
        },
      },
    ],
    edges: [],
  });

  console.log('Created plan:', plan.id);

  const execution = await executionRepo.create({
    planId: plan.id,
    status: 'pending',
  });

  console.log('Created execution:', execution.id);

  // 4. Query data
  const allPlans = await planRepo.findMany();
  console.log('Total plans:', allPlans.length);

  const pendingExecutions = await executionRepo.findMany({
    filter: { status: 'pending' },
    limit: 10,
  });
  console.log('Pending executions:', pendingExecutions.length);

  // 5. Update data
  await executionRepo.update(execution.id, {
    status: 'running',
    startedAt: new Date(),
  });

  // 6. Use job queue
  const queue = storage.queue<ExecutePlanJob>();

  // Enqueue a job
  const jobId = await queue.enqueue(
    { planId: plan.id, executionId: execution.id },
    { priority: 10, runAt: new Date() }
  );

  console.log('Enqueued job:', jobId);

  // Dequeue and process
  const job = await queue.dequeue();
  if (job) {
    console.log('Processing job:', job.id);
    try {
      // Simulate work
      await new Promise(resolve => setTimeout(resolve, 100));
      await queue.acknowledge(job.id);
      console.log('Job completed');
    } catch (error) {
      await queue.fail(job.id, error as Error, true);
      console.error('Job failed, will retry');
    }
  }

  // 7. Transactions (if supported)
  try {
    await storage.transaction(async (tx) => {
      // Create execution and enqueue job atomically
      const exec = await tx.repository<Execution>('executions').create({
        planId: plan.id,
        status: 'pending',
      });
      
      await tx.queue<ExecutePlanJob>().enqueue({
        planId: plan.id,
        executionId: exec.id,
      });
    });
  } catch (error) {
    console.error('Transaction failed:', error);
  }

  // 8. Cleanup
  await storage.disconnect();
}

// Run example if this file is executed directly
if (require.main === module) {
  exampleUsage().catch(console.error);
}

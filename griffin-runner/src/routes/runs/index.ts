import { Type } from "typebox";
import {
  JobRunSchema,
  JobRunStatus,
  TriggerType,
  type JobRun,
} from "../../schemas/job-run.js";
import type { TestPlanV1 } from "griffin-plan-executor";
import { FastifyTypeBox } from "../../types.js";

// Query parameters for listing runs
const ListRunsQuerySchema = Type.Object({
  planId: Type.Optional(Type.String()),
  status: Type.Optional(
    Type.Union([
      Type.Literal(JobRunStatus.PENDING),
      Type.Literal(JobRunStatus.RUNNING),
      Type.Literal(JobRunStatus.COMPLETED),
      Type.Literal(JobRunStatus.FAILED),
    ]),
  ),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  offset: Type.Optional(Type.Number({ minimum: 0 })),
});

const ListRunsResponseSchema = Type.Object({
  runs: Type.Array(JobRunSchema),
  total: Type.Number(),
  limit: Type.Number(),
  offset: Type.Number(),
});

const GetRunResponseSchema = JobRunSchema;

const TriggerExecutionParamsSchema = Type.Object({
  id: Type.String(),
});

const TriggerExecutionResponseSchema = Type.Object({
  jobRun: JobRunSchema,
  message: Type.String(),
});

export default function (fastify: FastifyTypeBox) {
  /**
   * GET /runs
   * List all job runs with optional filtering
   */
  fastify.get(
    "/runs",
    {
      schema: {
        querystring: ListRunsQuerySchema,
        response: {
          200: ListRunsResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { planId, status, limit = 50, offset = 0 } = request.query;

      const jobRunRepo = fastify.repository.repository<JobRun>("job_runs");

      // Build filter
      const filter: any = {};
      if (planId) filter.planId = planId;
      if (status) filter.status = status;

      // Get runs with pagination
      const runs = await jobRunRepo.findMany({
        filter,
        sort: { field: "startedAt", order: "desc" },
        limit,
        offset,
      });

      // Get total count
      const total = await jobRunRepo.count(filter);

      return reply.send({
        runs,
        total,
        limit,
        offset,
      });
    },
  );

  /**
   * GET /runs/:id
   * Get a specific job run by ID
   */
  fastify.get(
    "/runs/:id",
    {
      schema: {
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          200: GetRunResponseSchema,
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const jobRunRepo = fastify.repository.repository<JobRun>("job_runs");

      const jobRun = await jobRunRepo.findById(id);

      if (!jobRun) {
        return reply.code(404).send({
          error: `Job run not found: ${id}`,
        });
      }

      return reply.send(jobRun);
    },
  );

  /**
   * POST /plan/:id/run
   * Manually trigger a plan execution
   */
  fastify.post(
    "/plan/:id/run",
    {
      schema: {
        params: TriggerExecutionParamsSchema,
        response: {
          200: TriggerExecutionResponseSchema,
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const planRepo = fastify.repository.repository<TestPlanV1>("plans");
      const jobRunRepo = fastify.repository.repository<JobRun>("job_runs");
      const queue = fastify.jobQueue.queue("plan-executions");

      // Check if plan exists
      const plan = await planRepo.findById(id);
      if (!plan) {
        return reply.code(404).send({
          error: `Plan not found: ${id}`,
        });
      }

      // Create a JobRun record
      const now = new Date();
      const jobRun = await jobRunRepo.create({
        planId: plan.id,
        planName: plan.name,
        status: JobRunStatus.PENDING,
        triggeredBy: TriggerType.MANUAL,
        startedAt: now.toISOString(),
      });

      // Enqueue the job
      await queue.enqueue(
        {
          type: "execute-plan",
          planId: plan.id,
          scheduledAt: now.toISOString(),
        },
        {
          runAt: now,
          priority: 10, // Higher priority for manual executions
          maxAttempts: 3,
        },
      );

      return reply.send({
        jobRun,
        message: `Plan execution triggered for: ${plan.name}`,
      });
    },
  );
}

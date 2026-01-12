import { Type, type Static } from "typebox";

export enum JobRunStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum TriggerType {
  SCHEDULE = "schedule",
  MANUAL = "manual",
  API = "api",
}

export const JobRunStatusSchema = Type.Union([
  Type.Literal(JobRunStatus.PENDING),
  Type.Literal(JobRunStatus.RUNNING),
  Type.Literal(JobRunStatus.COMPLETED),
  Type.Literal(JobRunStatus.FAILED),
]);

export const TriggerTypeSchema = Type.Union([
  Type.Literal(TriggerType.SCHEDULE),
  Type.Literal(TriggerType.MANUAL),
  Type.Literal(TriggerType.API),
]);

export const JobRunSchema = Type.Object({
  id: Type.Readonly(Type.String()),
  planId: Type.String(),
  planName: Type.String(),
  status: JobRunStatusSchema,
  triggeredBy: TriggerTypeSchema,
  startedAt: Type.String(), // ISO timestamp
  completedAt: Type.Optional(Type.String()),
  duration_ms: Type.Optional(Type.Number()),
  success: Type.Optional(Type.Boolean()),
  errors: Type.Optional(Type.Array(Type.String())),
});

export type JobRun = Static<typeof JobRunSchema>;

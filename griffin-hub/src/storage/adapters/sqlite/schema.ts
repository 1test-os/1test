/**
 * SQLite database schema using Drizzle ORM.
 * Mirrors the Postgres schema but uses SQLite-specific types.
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import {
  type Edge,
  type Node,
  type Frequency,
} from "@griffin-app/griffin-ts/types";
import { JobRunStatus, TriggerType } from "../../../schemas/job-run.js";
import { AgentStatus } from "../../../schemas/agent.js";

export const plansTable = sqliteTable("plans", {
  organization: text("organization").notNull(),
  project: text("project").notNull(),
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  version: text("version").notNull(),
  frequency: text("frequency", { mode: "json" }).$type<Frequency>().notNull(),
  locations: text("locations", { mode: "json" }).$type<string[]>(),
  nodes: text("nodes", { mode: "json" }).$type<Node[]>().notNull(),
  edges: text("edges", { mode: "json" }).$type<Edge[]>().notNull(),
  environment: text("environment").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const runsTable = sqliteTable("runs", {
  id: text("id").primaryKey(),
  planId: text("plan_id")
    .references(() => plansTable.id)
    .notNull(),
  executionGroupId: text("execution_group_id").notNull(),
  location: text("location").notNull(),
  environment: text("environment").notNull(),
  triggeredBy: text("triggered_by").$type<TriggerType>().notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  status: text("status").$type<JobRunStatus>().notNull(),
  duration_ms: integer("duration_ms"),
  success: integer("success", { mode: "boolean" }),
  errors: text("errors", { mode: "json" }).$type<string[]>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const agentsTable = sqliteTable("agents", {
  id: text("id").primaryKey(),
  location: text("location").notNull(),
  status: text("status").$type<AgentStatus>().notNull(),
  lastHeartbeat: integer("last_heartbeat", { mode: "timestamp" }).notNull(),
  registeredAt: integer("registered_at", { mode: "timestamp" }).notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, string>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

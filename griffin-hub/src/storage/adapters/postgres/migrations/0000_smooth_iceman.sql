CREATE TYPE "public"."agent_status" AS ENUM('online', 'offline');--> statement-breakpoint
CREATE TYPE "public"."job_queue_status" AS ENUM('pending', 'running', 'completed', 'failed', 'retrying');--> statement-breakpoint
CREATE TYPE "public"."job_run_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."trigger_type" AS ENUM('schedule', 'manual', 'api');--> statement-breakpoint
CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"location" text NOT NULL,
	"status" "agent_status" NOT NULL,
	"last_heartbeat" timestamp NOT NULL,
	"registered_at" timestamp NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"organization" text NOT NULL,
	"project" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"frequency" jsonb NOT NULL,
	"locations" jsonb,
	"nodes" jsonb NOT NULL,
	"edges" jsonb NOT NULL,
	"environment" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" text PRIMARY KEY NOT NULL,
	"plan_id" text NOT NULL,
	"execution_group_id" text NOT NULL,
	"location" text NOT NULL,
	"environment" text NOT NULL,
	"triggered_by" "trigger_type" NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"status" "job_run_status" NOT NULL,
	"duration_ms" integer,
	"success" boolean,
	"errors" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;
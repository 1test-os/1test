#!/usr/bin/env node

import { Command } from "commander";
import { executeInit } from "./commands/init.js";
import { executeValidate } from "./commands/validate.js";
import { executePlan } from "./commands/plan.js";
import { executeApply } from "./commands/apply.js";
import { executeStatus } from "./commands/status.js";
import { executeRun } from "./commands/run-remote.js";
import { executeGenerateKey } from "./commands/generate-key.js";
import {
  executeEnvList,
  executeEnvAdd,
  executeEnvRemove,
  executeEnvDefault,
} from "./commands/env.js";
import { executeRunnerSet, executeRunnerShow } from "./commands/runner.js";
import {
  executeConfigSet,
  executeConfigGet,
  executeConfigList,
  executeConfigDelete,
} from "./commands/config.js";
import { executeRunLocal } from "./commands/run.js";

const program = new Command();

program
  .name("griffin")
  .description("Griffin CLI - Monitoring as Code")
  .version("1.0.0");

// Import run-local command

// init command
program
  .command("init")
  .description("Initialize griffin in the current directory")
  .option(
    "--project <name>",
    "Project ID (defaults to package.json name or directory name)",
  )
  .action(async (options) => {
    await executeInit(options);
  });

// validate command
program
  .command("validate")
  .description("Validate test plan files without syncing")
  .action(async () => {
    await executeValidate();
  });

// plan command
program
  .command("plan")
  .description("Show what changes would be applied")
  .option(
    "--env <name>",
    "Environment to plan for (uses default if not specified)",
  )
  .option("--json", "Output in JSON format")
  .action(async (options) => {
    await executePlan(options);
  });

// apply command
program
  .command("apply")
  .description("Apply changes to the runner")
  .option(
    "--env <name>",
    "Environment to apply to (uses default if not specified)",
  )
  .option("--auto-approve", "Skip confirmation prompt")
  .option("--dry-run", "Show what would be done without making changes")
  .action(async (options) => {
    await executeApply(options);
  });

// status command
program
  .command("status")
  .description("Show runner status and recent runs")
  .option("--plan-id <id>", "Filter by plan ID")
  .option("--limit <number>", "Number of runs to show", "10")
  .action(async (options) => {
    await executeStatus({
      ...options,
      limit: parseInt(options.limit, 10),
    });
  });

// run-local command
program
  .command("run")
  .description("Run tests locally against a target environment")
  .option(
    "--env <name>",
    "Environment to run against (uses default if not specified)",
  )
  .action(async (options) => {
    await executeRunLocal(options);
  });

// run command
program
  .command("run-remote")
  .description("Trigger a plan run on the runner")
  .option("--plan-id <id>", "Plan ID to run")
  .option("--plan-name <name>", "Plan name to run")
  .option(
    "--env <name>",
    "Environment to use when resolving plan name from local state",
  )
  .requiredOption(
    "--target-env <name>",
    "Target environment for runner target resolution (e.g., staging, production)",
  )
  .option("--wait", "Wait for run to complete")
  .action(async (options) => {
    await executeRun(options);
  });

// generate-key command
program
  .command("generate-key")
  .description(
    "Generate a cryptographically secure API key for runner authentication",
  )
  .action(async () => {
    await executeGenerateKey();
  });

// env command group
const envCommand = program
  .command("env")
  .description("Manage target environments");

envCommand
  .command("list")
  .description("List all configured environments")
  .action(async () => {
    await executeEnvList();
  });

envCommand
  .command("add <name>")
  .description("Add or update an environment")
  .requiredOption("--base-url <url>", "Base URL for the environment")
  .action(async (name, options) => {
    await executeEnvAdd(name, options);
  });

envCommand
  .command("remove <name>")
  .description("Remove an environment")
  .action(async (name) => {
    await executeEnvRemove(name);
  });

envCommand
  .command("default <name>")
  .description("Set the default environment")
  .action(async (name) => {
    await executeEnvDefault(name);
  });

// runner command group
const runnerCommand = program
  .command("runner")
  .description("Manage runner connection settings");

runnerCommand
  .command("set")
  .description("Configure runner connection")
  .requiredOption("--base-url <url>", "Runner base URL")
  .option("--api-token <token>", "API authentication token")
  .action(async (options) => {
    await executeRunnerSet(options);
  });

runnerCommand
  .command("show")
  .description("Show current runner configuration")
  .action(async () => {
    await executeRunnerShow();
  });

// config command group
const configCommand = program
  .command("config")
  .description("Manage runner target configurations");

configCommand
  .command("set")
  .description("Set a target base URL for an organization and environment")
  .requiredOption("--org <id>", "Organization ID")
  .requiredOption("--env <name>", "Environment name")
  .requiredOption("--target <key>", "Target key")
  .requiredOption("--base-url <url>", "Base URL for the target")
  .action(async (options) => {
    await executeConfigSet({
      organizationId: options.org,
      environment: options.env,
      targetKey: options.target,
      baseUrl: options.baseUrl,
    });
  });

configCommand
  .command("get")
  .description("Get a target base URL for an organization and environment")
  .requiredOption("--org <id>", "Organization ID")
  .requiredOption("--env <name>", "Environment name")
  .requiredOption("--target <key>", "Target key")
  .action(async (options) => {
    await executeConfigGet({
      organizationId: options.org,
      environment: options.env,
      targetKey: options.target,
    });
  });

configCommand
  .command("list")
  .description("List all runner configurations")
  .option("--org <id>", "Filter by organization ID")
  .option("--env <name>", "Filter by environment name")
  .action(async (options) => {
    await executeConfigList({
      organizationId: options.org,
      environment: options.env,
    });
  });

configCommand
  .command("delete")
  .description("Delete a target from an organization and environment")
  .requiredOption("--org <id>", "Organization ID")
  .requiredOption("--env <name>", "Environment name")
  .requiredOption("--target <key>", "Target key")
  .action(async (options) => {
    await executeConfigDelete({
      organizationId: options.org,
      environment: options.env,
      targetKey: options.target,
    });
  });

// Parse arguments
program.parse();

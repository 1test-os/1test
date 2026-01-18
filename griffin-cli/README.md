# Griffin CLI

Terraform-like CLI for managing monitoring tests as code.

## Overview

Griffin CLI enables monitoring-as-code by syncing local test plan files to a Griffin runner. It provides a declarative workflow similar to Terraform:

1. Write test plans in TypeScript/JavaScript
2. Validate plans locally
3. Preview changes with `griffin plan`
4. Apply changes with `griffin apply`
5. Monitor execution with `griffin status`

## Installation

```bash
npm install -g griffin-cli
```

## Quick Start

### 1. Initialize

```bash
griffin init --runner-url http://localhost:3000
```

This creates:

- `.griffin/state.json` - tracks synced plans and project ID
- `.griffinrc.json` - project configuration

The project ID is auto-detected from `package.json` name or directory name. Override with `--project <name>`.

### 2. Create Test Plans

Create a file `api-health.griffin.ts`:

```typescript
import {
  TestPlanV1,
  HttpMethod,
  ResponseFormat,
  NodeType,
  FrequencyUnit,
} from "griffin-plan-executor";

export const healthCheck: TestPlanV1 = {
  id: "api-health-check",
  name: "API Health Check",
  version: "1.0",
  endpoint_host: "https://api.example.com",
  frequency: {
    every: 5,
    unit: FrequencyUnit.MINUTE,
  },
  nodes: [
    {
      id: "health-request",
      data: {
        type: NodeType.ENDPOINT,
        method: HttpMethod.GET,
        path: "/health",
        response_format: ResponseFormat.JSON,
      },
    },
    {
      id: "check-status",
      data: {
        type: NodeType.ASSERTION,
        assertions: [
          {
            path: ["status"],
            predicate: {
              expected: "ok",
              operator: 0, // EQUAL
            },
          },
        ],
      },
    },
  ],
  edges: [{ from: "health-request", to: "check-status" }],
};
```

### 3. Validate Plans

```bash
griffin validate
```

Checks that all plan files are valid without syncing.

### 4. Preview Changes

```bash
griffin plan
```

Shows what will be created, updated, or deleted.

### 5. Apply Changes

```bash
griffin apply
```

Syncs plans to the runner. Use `--auto-approve` to skip confirmation.

### 6. Check Status

```bash
griffin status
```

Shows recent run results.

### 7. Trigger Manual Run

```bash
griffin run --plan-name "API Health Check"
```

Triggers a plan execution. Use `--wait` to block until complete.

## Commands

### `griffin init`

Initialize Griffin in the current directory.

**Options:**

- `--runner-url <url>` - Runner base URL (required)
- `--api-token <token>` - API authentication token
- `--project <name>` - Project ID (defaults to package.json name or directory name)

**Example:**

```bash
griffin init --runner-url https://runner.example.com --api-token abc123
griffin init --runner-url http://localhost:3000 --project my-service
```

**Project Detection:**
Griffin auto-detects the project ID by:

1. Looking for `package.json` and using the `name` field
2. Falling back to the current directory name
3. Using the `--project` flag if provided

### `griffin validate`

Validate test plan files without syncing.

**Example:**

```bash
griffin validate
```

### `griffin plan`

Show what changes would be applied.

**Options:**

- `--json` - Output in JSON format

**Example:**

```bash
griffin plan
griffin plan --json
```

**Exit codes:**

- `0` - No changes
- `1` - Error
- `2` - Changes pending

### `griffin apply`

Apply changes to the runner.

**Options:**

- `--auto-approve` - Skip confirmation prompt
- `--dry-run` - Show what would be done without making changes

**Example:**

```bash
griffin apply
griffin apply --auto-approve
griffin apply --dry-run
```

### `griffin status`

Show runner status and recent runs.

**Options:**

- `--plan-id <id>` - Filter by plan ID
- `--limit <number>` - Number of runs to show (default: 10)

**Example:**

```bash
griffin status
griffin status --plan-id api-health-check --limit 5
```

### `griffin run`

Trigger a plan run on the runner.

**Options:**

- `--plan-id <id>` - Plan ID to run
- `--plan-name <name>` - Plan name to run
- `--wait` - Wait for run to complete

**Example:**

```bash
griffin run --plan-name "API Health Check"
griffin run --plan-id api-health-check --wait
```

## Configuration

### Environment Variables

- `GRIFFIN_RUNNER_URL` - Runner base URL
- `GRIFFIN_API_TOKEN` - API authentication token

### Config File (`.griffinrc.json`)

```json
{
  "runner": {
    "baseUrl": "http://localhost:3000",
    "apiToken": "your-token"
  },
  "discovery": {
    "pattern": "**/*.griffin.{ts,js}",
    "ignore": ["node_modules/**", "dist/**"]
  }
}
```

### Precedence

Configuration is resolved with the following precedence (highest to lowest):

1. CLI flags
2. Environment variables
3. Config file (`.griffinrc.json`)

## State Management

Griffin maintains a state file at `.griffin/state.json` that tracks:

- Project ID (set at init, stable across renames)
- Which plans have been synced
- Last applied hash (for change detection)
- Remote plan IDs

**Important:** Commit `.griffinrc.json` to version control, but add `.griffin/` to `.gitignore` for team workflows.

**Project Identity:**

- Project ID is captured during `griffin init`
- Stays stable even if you rename the package or directory
- Use `griffin rename --project <new-name>` (future feature) to change it

## Test Plan Discovery

By default, Griffin discovers test plans from files matching `**/*.griffin.{ts,js}`.

Plans must:

- Export `TestPlanV1` objects (default or named exports)
- Have all required fields (`id`, `name`, `version`, `endpoint_host`, `nodes`, `edges`)

## Diff Rules

Griffin computes changes using:

- **CREATE**: Plan exists locally but not in state
- **UPDATE**: Plan exists in both, but hash differs
- **DELETE**: Plan exists in state but not locally
- **NOOP**: Plan exists in both with same hash

Change detection uses a SHA-256 hash of the normalized plan payload.

## API Compatibility

Griffin CLI is compatible with `griffin-runner` API v1.

Required endpoints:

- `POST /plan/plan` - Create/update plan
- `GET /runs/runs` - List runs
- `GET /runs/runs/:id` - Get run details
- `POST /runs/plan/:id/run` - Trigger run

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development
npm run dev -- <command>

# Example
npm run dev -- validate
```

## Architecture

```
griffin-cli/
├── src/
│   ├── commands/         # Command implementations
│   │   ├── init.ts
│   │   ├── validate.ts
│   │   ├── plan.ts
│   │   ├── apply.ts
│   │   ├── status.ts
│   │   └── run.ts
│   ├── core/            # Core logic
│   │   ├── api.ts       # Runner API client
│   │   ├── apply.ts     # Apply engine
│   │   ├── config.ts    # Config management
│   │   ├── diff.ts      # Diff computation
│   │   ├── discovery.ts # Plan discovery
│   │   └── state.ts     # State management
│   ├── schemas/         # Type definitions
│   │   ├── payload.ts   # Plan payload schemas
│   │   └── state.ts     # State file schemas
│   ├── cli-new.ts       # CLI entry point
│   └── index.ts         # Public API exports
└── package.json
```

## License

MIT

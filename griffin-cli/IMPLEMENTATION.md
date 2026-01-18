# Griffin CLI MVP Implementation Summary

## Overview

This document summarizes the v1 implementation of the Griffin CLI, a Terraform-like tool for monitoring-as-code.

## Design Decisions (v1)

Based on our discussion, the following choices were locked for v1:

| Decision          | Choice                          | Rationale                                  |
| ----------------- | ------------------------------- | ------------------------------------------ |
| **Plan Identity** | DSL `name` field                | Simple mental model, stable across changes |
| **Suites**        | CLI-only (expand to plans)      | Keep runner API simple                     |
| **Auth**          | Static API token in config      | Easy to implement, env var override        |
| **Environment**   | Runner selection (via base URL) | Clean separation, payload stays stable     |
| **State**         | Local file only                 | Simple, fast, easy to debug                |
| **History**       | No history or rollbacks         | Out of scope for v1                        |

## Architecture

### Core Modules

```
griffin-cli/src/
├── schemas/           # Type definitions (Typebox)
│   ├── state.ts      # State file schema
│   └── payload.ts    # Plan payload + hashing
├── core/             # Core business logic
│   ├── state.ts      # State file I/O
│   ├── config.ts     # Config resolution
│   ├── discovery.ts  # Plan file discovery
│   ├── diff.ts       # Change detection
│   ├── apply.ts      # Change application
│   └── api.ts        # Runner API client
└── commands/         # CLI command implementations
    ├── init.ts
    ├── validate.ts
    ├── plan.ts
    ├── apply.ts
    ├── status.ts
    └── run.ts
```

### Data Flow

```
1. Discovery: Find *.griffin.{ts,js} files
   ↓
2. Load: Import and validate exports
   ↓
3. Normalize: Compute deterministic hashes
   ↓
4. Diff: Compare local vs state vs remote
   ↓
5. Apply: Execute create/update/delete
   ↓
6. Update State: Save new hashes and IDs
```

## Schema Definitions

### State File (`StateFileSchema`)

```typescript
{
  stateVersion: 1,
  runner: {
    baseUrl: string,
    apiToken?: string
  },
  plans: [
    {
      localPath: string,
      exportName: string,
      planName: string,
      planId: string,
      lastAppliedHash: string,
      lastAppliedAt: string (ISO)
    }
  ]
}
```

Stored at: `.griffin/state.json`

### Config File (`ConfigFileSchema`)

```typescript
{
  runner?: {
    baseUrl?: string,
    apiToken?: string
  },
  discovery?: {
    pattern?: string,
    ignore?: string[]
  }
}
```

Stored at: `.griffinrc.json`

### Plan Payload (`PlanPayloadSchema`)

Directly uses `TestPlanV1Schema` from `griffin-plan-executor`:

```typescript
{
  id: string,
  name: string,
  version: "1.0",
  endpoint_host: string,
  frequency?: { every: number, unit: FrequencyUnit },
  nodes: Node[],
  edges: Edge[]
}
```

## Diff Rules

### Change Detection

- **Input**: Normalized plan payload (sorted keys, stable JSON)
- **Hash**: SHA-256 of serialized payload
- **Comparison**: Hash equality determines changes

### Diff Actions

| Action     | Condition                   | Behavior                              |
| ---------- | --------------------------- | ------------------------------------- |
| **CREATE** | Plan in local, not in state | POST to runner, add to state          |
| **UPDATE** | Plan in both, hash differs  | POST to runner (upsert), update state |
| **DELETE** | Plan in state, not in local | DELETE from runner, remove from state |
| **NOOP**   | Plan in both, hash matches  | Skip                                  |

### Drift Handling

- Only plans tracked in state are managed
- Unknown remote plans are ignored (no accidental deletion)
- Deletes only occur for plans previously synced by CLI

## CLI Commands

### Command Matrix

| Command    | State Required | Runner Connection | Modifies State | Modifies Runner |
| ---------- | -------------- | ----------------- | -------------- | --------------- |
| `init`     | No             | No                | Creates        | No              |
| `validate` | No             | No                | No             | No              |
| `plan`     | Yes            | Yes (read)        | No             | No              |
| `apply`    | Yes            | Yes (write)       | Yes            | Yes             |
| `status`   | No             | Yes (read)        | No             | No              |
| `run`      | Yes (optional) | Yes (write)       | No             | No              |

### Exit Codes

- `0` - Success / No changes
- `1` - Error
- `2` - Changes pending (plan command only)

### Configuration Precedence

```
CLI flags (highest)
  ↓
Environment variables (GRIFFIN_RUNNER_URL, GRIFFIN_API_TOKEN)
  ↓
Config file (.griffinrc.json)
  ↓
Defaults (lowest)
```

## API Client

### Endpoints Used

| Method | Path                 | Purpose                     |
| ------ | -------------------- | --------------------------- |
| GET    | `/`                  | Health check                |
| POST   | `/plan/plan`         | Create/update plan (upsert) |
| GET    | `/runs/runs`         | List runs (with filters)    |
| GET    | `/runs/runs/:id`     | Get run details             |
| POST   | `/runs/plan/:id/run` | Trigger run                 |

### Missing Endpoints (Future)

- `GET /plans` - List all plans (currently returns empty array)
- `DELETE /plans/:id` - Delete plan (currently warns)

The CLI is designed to work without these, but functionality is limited.

## Discovery Rules

### File Patterns

Default: `**/*.griffin.{ts,js}`

### Export Rules

- Plans must be exported (default or named)
- All exports must be valid `TestPlanV1` objects
- Invalid exports trigger errors
- Empty files (no exports) fail validation

### Type Guard

```typescript
function isPlan(value: unknown): value is TestPlanV1 {
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    value.version === "1.0" &&
    typeof value.endpoint_host === "string" &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges)
  );
}
```

## Technology Choices

### ES6 Modules

- **Module system**: ES2022
- **Module resolution**: `bundler`
- **File extensions**: `.js` for imports (required by Node.js ESM)
- **package.json**: `"type": "module"`

### Dependencies

| Package                 | Version      | Purpose                             |
| ----------------------- | ------------ | ----------------------------------- |
| `typebox`               | ^0.34.14     | Schema validation (updated package) |
| `commander`             | ^12.1.0      | CLI framework                       |
| `glob`                  | ^11.0.0      | File discovery                      |
| `griffin-plan-executor` | workspace:\* | Plan types and execution            |

### TypeScript Config

```json
{
  "module": "ES2022",
  "moduleResolution": "bundler",
  "target": "ES2022"
}
```

## Validation Strategy

### Typebox Integration

All schemas use Typebox for:

- Runtime validation
- Type inference
- Error reporting

Example:

```typescript
import { Value } from "typebox/value";

if (!Value.Check(StateFileSchema, data)) {
  const errors = [...Value.Errors(StateFileSchema, data)];
  // Report validation errors
}
```

### Validation Points

1. **Discovery**: Plans validated as they're imported
2. **State Load**: State file validated against schema
3. **Config Load**: Config file validated against schema
4. **API Responses**: Validated before use (implicit via types)

## Error Handling

### Principles

- Fail fast with clear error messages
- Include file paths in discovery errors
- Validate before making changes
- Exit with non-zero codes on failure

### Error Categories

| Category        | Exit Code | Example                          |
| --------------- | --------- | -------------------------------- |
| User error      | 1         | Missing state file, invalid plan |
| Network error   | 1         | Cannot connect to runner         |
| Changes pending | 2         | Plan shows diffs (not an error)  |

## Future Considerations

### Deferred to Post-v1

- **Remote state**: S3/database backend for teams
- **Plan suites**: First-class runner support
- **History/audit**: Track plan revisions
- **Rollbacks**: Revert to previous plan versions
- **Plan targeting**: Apply only specific plans
- **Parallel apply**: Batch create/update operations
- **Watch mode**: Auto-apply on file changes
- **Import**: Bring existing remote plans into state

### API Gaps

The current runner API is missing:

- List plans endpoint (affects `plan` command accuracy)
- Delete plan endpoint (affects cleanup)
- Update plan endpoint (using POST for upsert)

These should be added to the runner in a future iteration.

## Testing Strategy (Not Implemented)

Recommended test coverage:

1. **Unit tests**
   - Schema validation
   - Hash computation
   - Diff algorithm
   - Config resolution

2. **Integration tests**
   - Discovery with fixture files
   - State file I/O
   - API client against mock server

3. **E2E tests**
   - Full workflow: init → validate → plan → apply
   - Against local runner instance

## Migration Path

From old CLI to new CLI:

1. Install new package
2. Run `griffin init --runner-url <url>`
3. Existing test files should work (if using TestPlanV1)
4. Old state is not migrated (fresh start)

## Documentation

- **README.md**: User-facing documentation
- **IMPLEMENTATION.md**: This file (technical reference)
- **Inline comments**: JSDoc for all public APIs

## Summary

The v1 CLI provides:

✅ Terraform-like workflow (init/plan/apply)  
✅ Local state management  
✅ Deterministic change detection  
✅ Type-safe schemas with Typebox  
✅ ES6 module architecture  
✅ Comprehensive error handling  
✅ Runner API integration

Not included in v1:

❌ Remote state  
❌ Plan history/rollbacks  
❌ Suite-level operations  
❌ OAuth authentication  
❌ Complete runner API (list/delete missing)

This provides a solid foundation for monitoring-as-code while keeping the initial implementation focused and maintainable.

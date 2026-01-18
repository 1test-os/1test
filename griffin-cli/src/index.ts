// Export core types and utilities
export type {
  StateFile,
  PlanStateEntry,
  RunnerConfig,
} from "./schemas/state.js";
export type {
  DiscoveredPlan,
  DiscoveryResult,
  DiscoveryError,
} from "./core/discovery.js";
export type { DiffAction, DiffResult } from "./core/diff.js";
export type { ApplyResult, ApplyAction, ApplyError } from "./core/apply.js";

// Export core functions
export {
  createEmptyState,
  StateFileSchema,
  PlanStateEntrySchema,
  RunnerConfigSchema,
} from "./schemas/state.js";

export { normalizePlanPayload, hashPlanPayload } from "./schemas/payload.js";

export {
  getStateDirPath,
  getStateFilePath,
  stateExists,
  loadState,
  saveState,
  initState,
  addEnvironment,
  removeEnvironment,
  setDefaultEnvironment,
  resolveEnvironment,
  getEnvironment,
} from "./core/state.js";

export { discoverPlans, formatDiscoveryErrors } from "./core/discovery.js";

export { computeDiff, formatDiff, formatDiffJson } from "./core/diff.js";

export { applyDiff, formatApplyResult } from "./core/apply.js";

export { createSdkClients, injectProjectId } from "./core/sdk.js";

export { detectProjectId } from "./core/project.js";

// Export command executors (for programmatic use)
export { executeInit } from "./commands/init.js";
export { executeValidate } from "./commands/validate.js";
export { executePlan } from "./commands/plan.js";
export { executeApply } from "./commands/apply.js";
export { executeStatus } from "./commands/status.js";
export { executeRun } from "./commands/run-remote.js";
export {
  executeEnvList,
  executeEnvAdd,
  executeEnvRemove,
  executeEnvDefault,
} from "./commands/env.js";

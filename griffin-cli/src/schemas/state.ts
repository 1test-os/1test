import { Type, type Static } from "typebox";

/**
 * State file schema for tracking synced plans and environments
 * Stored in .griffin/state.json
 */

export const PlanStateEntrySchema = Type.Object({
  localPath: Type.String(),
  exportName: Type.String(),
  planName: Type.String(),
  planId: Type.String(),
  lastAppliedHash: Type.String(),
  lastAppliedAt: Type.String(), // ISO timestamp
});

export type PlanStateEntry = Static<typeof PlanStateEntrySchema>;

export const EnvironmentConfigSchema = Type.Object({
  baseUrl: Type.String(),
});

export type EnvironmentConfig = Static<typeof EnvironmentConfigSchema>;

export const RunnerConfigSchema = Type.Object({
  baseUrl: Type.String(),
  apiToken: Type.Optional(Type.String()),
});

export type RunnerConfig = Static<typeof RunnerConfigSchema>;

export const DiscoveryConfigSchema = Type.Object({
  pattern: Type.Optional(Type.String()),
  ignore: Type.Optional(Type.Array(Type.String())),
});

export type DiscoveryConfig = Static<typeof DiscoveryConfigSchema>;

export const StateFileSchema = Type.Object({
  stateVersion: Type.Literal(2),
  projectId: Type.String(),

  // Environment configuration
  environments: Type.Record(Type.String(), EnvironmentConfigSchema),
  defaultEnvironment: Type.Optional(Type.String()),

  // Runner connection (for remote execution)
  runner: Type.Optional(RunnerConfigSchema),

  // Discovery settings
  discovery: Type.Optional(DiscoveryConfigSchema),

  // Per-environment plan state
  plans: Type.Record(Type.String(), Type.Array(PlanStateEntrySchema)),
});

export type StateFile = Static<typeof StateFileSchema>;

/**
 * Create an empty state file with a default environment
 */
export function createEmptyState(projectId: string): StateFile {
  return {
    stateVersion: 2,
    projectId,
    environments: {},
    plans: {},
  };
}

/**
 * Create state file with a default local environment
 */
export function createStateWithDefaultEnv(
  projectId: string,
  baseUrl: string = "http://localhost:3000",
): StateFile {
  return {
    stateVersion: 2,
    projectId,
    environments: {
      local: { baseUrl },
    },
    defaultEnvironment: "local",
    plans: {
      local: [],
    },
  };
}

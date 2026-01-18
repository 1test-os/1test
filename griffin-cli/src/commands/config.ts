import { loadState } from "../core/state.js";
import { createSdkClients } from "../core/sdk.js";

interface RunnerConfig {
  id: string;
  organizationId: string;
  environment: string;
  targets: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigSetOptions {
  organizationId: string;
  environment: string;
  targetKey: string;
  baseUrl: string;
}

/**
 * Set a target for an organization and environment
 */
export async function executeConfigSet(
  options: ConfigSetOptions,
): Promise<void> {
  try {
    const state = await loadState();

    if (!state.runner?.baseUrl) {
      console.error("Error: Runner URL not configured.");
      console.log("Configure with:");
      console.log("  griffin runner set --base-url <url> --api-token <token>");
      process.exit(1);
    }

    const { configApi } = createSdkClients({
      baseUrl: state.runner.baseUrl,
      apiToken: state.runner.apiToken,
    });

    const result =
      await configApi.configOrganizationIdEnvironmentTargetsTargetKeyPut(
        options.organizationId,
        options.environment,
        options.targetKey,
        {
          baseUrl: options.baseUrl,
        },
      );
    //.setTarget(options.organizationId, options.environment, options.targetKey, options.baseUrl);

    //const result = await runnerRequest<{ data: RunnerConfig }>(
    //  state.runner.baseUrl,
    //  state.runner.apiToken,
    //  path,
    //  {
    //    method: "PUT",
    //    body: JSON.stringify({ baseUrl: options.baseUrl }),
    //  },
    //);

    console.log(`✓ Target "${options.targetKey}" set to ${options.baseUrl}`);
    console.log(`  Organization: ${options.organizationId}`);
    console.log(`  Environment: ${options.environment}`);
    console.log(
      `  Updated at: ${new Date(result.data.data.updatedAt).toLocaleString()}`,
    );
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

export interface ConfigGetOptions {
  organizationId: string;
  environment: string;
  targetKey: string;
}

/**
 * Get a target for an organization and environment
 */
export async function executeConfigGet(
  options: ConfigGetOptions,
): Promise<void> {
  try {
    const state = await loadState();

    if (!state.runner?.baseUrl) {
      console.error("Error: Runner URL not configured.");
      console.log("Configure with:");
      console.log("  griffin runner set --base-url <url> --api-token <token>");
      process.exit(1);
    }
    const { configApi } = createSdkClients({
      baseUrl: state.runner.baseUrl,
      apiToken: state.runner.apiToken,
    });

    const result =
      await configApi.configOrganizationIdEnvironmentTargetsTargetKeyGet(
        options.organizationId,
        options.environment,
        options.targetKey,
      );

    console.log(`Target: ${options.targetKey}`);
    console.log(`Base URL: ${result.data.data.baseUrl}`);
    console.log(`Organization: ${options.organizationId}`);
    console.log(`Environment: ${options.environment}`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

export interface ConfigListOptions {
  organizationId?: string;
  environment?: string;
}

/**
 * List all runner configs
 */
export async function executeConfigList(
  options: ConfigListOptions,
): Promise<void> {
  try {
    const state = await loadState();

    if (!state.runner?.baseUrl) {
      console.error("Error: Runner URL not configured.");
      console.log("Configure with:");
      console.log("  griffin runner set --base-url <url> --api-token <token>");
      process.exit(1);
    }

    const params = new URLSearchParams();
    if (options.organizationId)
      params.append("organizationId", options.organizationId);
    if (options.environment) params.append("environment", options.environment);

    const { configApi } = createSdkClients({
      baseUrl: state.runner.baseUrl,
      apiToken: state.runner.apiToken,
    });

    const result = await configApi.configGet(
      options.organizationId,
      options.environment,
    );

    if (result.data.data.length === 0 || !result.data.data) {
      console.log("No runner configs found.");
      return;
    }

    console.log(`Found ${result.data.data.length} runner config(s):`);
    console.log("");

    for (const config of result.data.data) {
      console.log(`Organization: ${config.organizationId}`);
      console.log(`Environment: ${config.environment}`);
      console.log(`Targets:`);

      const targetCount = Object.keys(config.targets).length;
      if (targetCount === 0) {
        console.log("  (none)");
      } else {
        for (const [key, baseUrl] of Object.entries(config.targets)) {
          console.log(`  ${key}: ${baseUrl}`);
        }
      }

      console.log(`Updated: ${new Date(config.updatedAt).toLocaleString()}`);
      console.log("");
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

export interface ConfigDeleteOptions {
  organizationId: string;
  environment: string;
  targetKey: string;
}

/**
 * Delete a target from an organization and environment
 */
export async function executeConfigDelete(
  options: ConfigDeleteOptions,
): Promise<void> {
  try {
    const state = await loadState();

    if (!state.runner?.baseUrl) {
      console.error("Error: Runner URL not configured.");
      console.log("Configure with:");
      console.log("  griffin runner set --base-url <url> --api-token <token>");
      process.exit(1);
    }
    const { configApi } = createSdkClients({
      baseUrl: state.runner.baseUrl,
      apiToken: state.runner.apiToken,
    });

    await configApi.configOrganizationIdEnvironmentTargetsTargetKeyDelete(
      options.organizationId,
      options.environment,
      options.targetKey,
    );
    console.log(`✓ Target "${options.targetKey}" deleted`);
    console.log(`  Organization: ${options.organizationId}`);
    console.log(`  Environment: ${options.environment}`);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

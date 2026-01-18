import { loadState, resolveEnvironment } from "../core/state.js";
import { createSdkClients } from "../core/sdk.js";

export interface RunOptions {
  planId?: string;
  planName?: string;
  wait?: boolean;
  env?: string;
  targetEnv?: string;
}

/**
 * Trigger a plan run on the runner
 */
export async function executeRun(options: RunOptions): Promise<void> {
  try {
    // TODO: remove this. Users shoud be able to execute all plans if they want.

    if (!options.planId && !options.planName) {
      console.error("Error: Either --plan-id or --plan-name must be provided");
      process.exit(1);
    }

    if (!options.targetEnv) {
      console.error(
        "Error: --target-env must be provided (e.g., staging, production)",
      );
      process.exit(1);
    }

    // Load state
    const state = await loadState();

    if (!state.runner?.baseUrl) {
      console.error("Error: Runner URL not configured.");
      console.log("Configure with:");
      console.log("  griffin runner set --base-url <url> --api-token <token>");
      process.exit(1);
    }

    // Create SDK clients (for status polling)
    const { runsApi } = createSdkClients({
      baseUrl: state.runner.baseUrl,
      apiToken: state.runner.apiToken || undefined,
    });

    // Resolve plan ID from name if needed
    let planId = options.planId;
    if (!planId && options.planName) {
      // Resolve environment to search in
      const envName = await resolveEnvironment(options.env);
      const envPlans = state.plans[envName] || [];

      const stateEntry = envPlans.find((p) => p.planName === options.planName);

      if (!stateEntry) {
        console.error(`Error: Plan "${options.planName}" not found in state`);
        console.error("Run 'griffin apply' to sync your plans first");
        process.exit(1);
      }

      planId = stateEntry.planId;
    }

    // Trigger the run with environment
    console.log(`Triggering run for plan: ${planId}`);
    console.log(`Target environment: ${options.targetEnv}`);

    const response = await runsApi.runsTriggerPlanIdPost(planId!, {
      environment: options.targetEnv,
    });
    console.log(`Run ID: ${response.data.data.id}`);
    console.log(`Status: ${response.data.data.status}`);
    console.log(
      `Started: ${new Date(response.data.data.startedAt).toLocaleString()}`,
    );

    // Wait for completion if requested
    if (options.wait) {
      console.log("");
      console.log("Waiting for run to complete...");

      const runId = response.data.data.id;
      let completed = false;

      while (!completed) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Poll every 2 seconds

        const { data: runResponse } = await runsApi.runsIdGet(runId);
        const run = runResponse.data;

        if (run.status === "completed" || run.status === "failed") {
          completed = true;

          console.log("");
          console.log(`✓ Run ${run.status}`);

          if (run.duration_ms) {
            console.log(`Duration: ${(run.duration_ms / 1000).toFixed(2)}s`);
          }

          if (run.success !== undefined) {
            console.log(`Success: ${run.success ? "Yes" : "No"}`);
          }

          if (run.errors && run.errors.length > 0) {
            console.log("");
            console.log("Errors:");
            for (const error of run.errors) {
              console.log(`  - ${error}`);
            }
          }

          if (!run.success) {
            process.exit(1);
          }
        } else {
          process.stdout.write(".");
        }
      }
    } else {
      console.log("");
      console.log("Run started. Use 'griffin status' to check progress.");
    }
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

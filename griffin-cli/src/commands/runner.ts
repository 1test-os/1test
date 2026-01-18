import { loadState, saveState } from "../core/state.js";

export interface RunnerSetOptions {
  baseUrl: string;
  apiToken?: string;
}

/**
 * Configure runner connection settings
 */
export async function executeRunnerSet(
  options: RunnerSetOptions,
): Promise<void> {
  try {
    const state = await loadState();

    // Update runner config
    state.runner = {
      baseUrl: options.baseUrl,
      apiToken: options.apiToken,
    };

    await saveState(state);

    console.log("✓ Runner configuration updated");
    console.log(`  Base URL: ${options.baseUrl}`);
    if (options.apiToken) {
      console.log("  API Token: ***");
    }
    console.log("");
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Show current runner configuration
 */
export async function executeRunnerShow(): Promise<void> {
  try {
    const state = await loadState();

    if (!state.runner) {
      console.log("No runner configured.");
      console.log("");
      console.log("Configure with:");
      console.log("  griffin runner set --base-url <url> --api-token <token>");
      return;
    }

    console.log("Runner configuration:");
    console.log(`  Base URL: ${state.runner.baseUrl}`);
    if (state.runner.apiToken) {
      console.log(`  API Token: ${state.runner.apiToken.substring(0, 8)}...`);
    } else {
      console.log("  API Token: (not set)");
    }
    console.log("");
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

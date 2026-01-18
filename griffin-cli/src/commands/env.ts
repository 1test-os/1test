import {
  loadState,
  addEnvironment,
  removeEnvironment,
  setDefaultEnvironment,
} from "../core/state.js";

export interface EnvAddOptions {
  baseUrl: string;
}

export interface EnvRemoveOptions {
  name: string;
}

export interface EnvDefaultOptions {
  name: string;
}

/**
 * List all environments
 */
export async function executeEnvList(): Promise<void> {
  try {
    const state = await loadState();
    const envNames = Object.keys(state.environments);

    if (envNames.length === 0) {
      console.log("No environments configured.");
      console.log("");
      console.log("Add an environment with:");
      console.log("  griffin env add <name> --base-url <url>");
      return;
    }

    console.log("Environments:");
    console.log("");

    envNames.forEach((name) => {
      const config = state.environments[name];
      const isDefault = name === state.defaultEnvironment;
      const marker = isDefault ? " (default)" : "";
      console.log(`  ${name}${marker}`);
      console.log(`    URL: ${config.baseUrl}`);
    });

    console.log("");
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Add or update an environment
 */
export async function executeEnvAdd(
  name: string,
  options: EnvAddOptions,
): Promise<void> {
  try {
    const state = await loadState();
    const isUpdate = name in state.environments;

    await addEnvironment(name, { baseUrl: options.baseUrl });

    if (isUpdate) {
      console.log(`✓ Updated environment '${name}'`);
    } else {
      console.log(`✓ Added environment '${name}'`);
    }

    console.log(`  URL: ${options.baseUrl}`);

    // Show if this was set as default
    const updatedState = await loadState();
    if (updatedState.defaultEnvironment === name && !isUpdate) {
      console.log("  (set as default - first environment)");
    }

    console.log("");
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Remove an environment
 */
export async function executeEnvRemove(name: string): Promise<void> {
  try {
    const state = await loadState();

    // Check if environment exists
    if (!(name in state.environments)) {
      console.error(`Error: Environment '${name}' does not exist`);
      console.log("");
      console.log("Available environments:");
      Object.keys(state.environments).forEach((env) => {
        console.log(`  - ${env}`);
      });
      process.exit(1);
    }

    // Warn if there are plans in this environment
    const planCount = state.plans[name]?.length || 0;
    if (planCount > 0) {
      console.log(
        `Warning: Environment '${name}' has ${planCount} synced plan(s).`,
      );
      console.log("This will remove all plan state for this environment.");
      console.log("");
    }

    await removeEnvironment(name);
    console.log(`✓ Removed environment '${name}'`);

    // Show new default if it changed
    const updatedState = await loadState();
    if (
      updatedState.defaultEnvironment &&
      updatedState.defaultEnvironment !== name
    ) {
      console.log(`  New default: ${updatedState.defaultEnvironment}`);
    }

    console.log("");
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Set default environment
 */
export async function executeEnvDefault(name: string): Promise<void> {
  try {
    const state = await loadState();

    // Check if environment exists
    if (!(name in state.environments)) {
      console.error(`Error: Environment '${name}' does not exist`);
      console.log("");
      console.log("Available environments:");
      Object.keys(state.environments).forEach((env) => {
        console.log(`  - ${env}`);
      });
      process.exit(1);
    }

    await setDefaultEnvironment(name);
    console.log(`✓ Set '${name}' as default environment`);
    console.log("");
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

import {
  initState,
  stateExists,
  getStateFilePath,
  addEnvironment,
} from "../core/state.js";
import { detectProjectId } from "../core/project.js";

export interface InitOptions {
  project?: string;
}

/**
 * Initialize griffin in the current directory
 */
export async function executeInit(options: InitOptions): Promise<void> {
  console.log("Initializing griffin...");

  // Check if already initialized
  if (await stateExists()) {
    console.error(
      `Error: Already initialized (state file exists: ${getStateFilePath()})`,
    );
    process.exit(1);
  }

  // Determine project ID
  let projectId = options.project;
  if (!projectId) {
    projectId = await detectProjectId();
  }

  console.log(`Project: ${projectId}`);
  console.log("");

  // Initialize state file
  await initState(projectId);
  console.log(`✓ Created state file: ${getStateFilePath()}`);

  // Create a default local environment
  await addEnvironment("local", { baseUrl: "http://localhost:3000" });
  console.log(`✓ Created default 'local' environment`);
  console.log(`  URL: http://localhost:3000`);

  console.log("");
  console.log("Initialization complete!");
  console.log("");
  console.log("Next steps:");
  console.log("  1. Configure environments:");
  console.log(
    "     griffin env add production --base-url https://api.example.com",
  );
  console.log(
    "     griffin env add staging --base-url https://staging.api.example.com",
  );
  console.log(
    "  2. Create test plans (*.griffin.ts files in __griffin__/ directories)",
  );
  console.log("  3. Run tests locally:");
  console.log("     griffin run");
  console.log("  4. Deploy to hub (optional):");
  console.log("     griffin apply --env production");
}

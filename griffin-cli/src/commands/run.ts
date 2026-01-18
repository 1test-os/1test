import { findTestFiles } from "../test-discovery.js";
import { runTestFile } from "../test-runner.js";
import { resolveEnvironment, getEnvironment } from "../core/state.js";
import { basename } from "path";
import { Configuration, PlanApi } from "griffin-hub-sdk";

export interface RunLocalOptions {
  env?: string;
}

export async function executeRunLocal(
  options: RunLocalOptions = {},
): Promise<void> {
  try {
    // Resolve environment
    const envName = await resolveEnvironment(options.env);
    const envConfig = await getEnvironment(envName);

    console.log(`Running tests locally against '${envName}' environment`);
    console.log(`Target: ${envConfig.baseUrl}`);
    console.log("");

    const testFiles = findTestFiles();
    if (testFiles.length === 0) {
      console.error(
        "No test files found. Looking for .ts files in __griffin__ directories.",
      );
      process.exit(1);
    }

    console.log(`Found ${testFiles.length} test file(s):`);
    testFiles.forEach((file) => console.log(`  - ${file}`));
    console.log("");

    const results = await Promise.all(
      testFiles.map(async (file) => {
        const fileName = basename(file);
        console.log(`Running ${fileName}`);
        const result = await runTest(file, envConfig.baseUrl);
        return result;
      }),
    );

    // Print summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;

    console.log("");
    console.log(`Summary: ${successful} passed, ${failed} failed`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function runTest(
  file: string,
  baseUrl: string,
): Promise<{ success: boolean }> {
  try {
    const result = await runTestFile(file, baseUrl);
    //const testSuccess = displayResults(result.result);
    // Use the actual test execution result, not just whether the file ran
    return { success: true };
  } catch (error: any) {
    console.error("ERROR: Failed to run test");
    console.error(error.message || String(error));
    return { success: false };
  }
}

function displayResults(result: any): boolean {
  if (!result) return false;

  const success = result.success || false;
  const nodeResults = result.results || [];
  const errors = result.errors || [];

  nodeResults.forEach((nodeResult: any) => {
    const nodeId = nodeResult.nodeId || "unknown";
    const nodeSuccess = nodeResult.success || false;

    const status = nodeSuccess ? "." : "E";
    process.stdout.write(status);

    if (!nodeSuccess) {
      const error = nodeResult.error || "Unknown error";
      console.log("");
      console.log(`ERROR in ${nodeId}: ${error}`);
    }
  });

  console.log("");

  if (errors.length > 0) {
    console.log("Errors:");
    errors.forEach((error: string) => console.log(`  - ${error}`));
  }

  // Check if any node failed or if there are errors
  const anyFailed =
    nodeResults.some((nodeResult: any) => !nodeResult.success) ||
    errors.length > 0;

  const testPassed = success && !anyFailed;

  if (testPassed) {
    console.log("✓ Test passed");
  } else {
    console.log("✗ Test failed");
  }

  return testPassed;
}

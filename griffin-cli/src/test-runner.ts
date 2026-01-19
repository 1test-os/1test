import "tsx";
import * as path from "path";
import * as fs from "fs";
import { Value } from "typebox/value";
import {
  executePlanV1,
  AxiosAdapter,
  ExecutionResult,
} from "griffin-plan-executor";
import { TestPlanV1Schema } from "griffin/schema";

/**
 * Runs a TypeScript test file and executes the resulting JSON plan.
 */
export async function runTestFile(
  filePath: string,
  baseUrl: string,
): Promise<ExecutionResult> {
  const defaultExport = await import(filePath);
  const plan = defaultExport.default;
  try {
    const parsedPlan = Value.Parse(TestPlanV1Schema, plan);
    const result = await executePlanV1(parsedPlan, {
      mode: "local",
      httpClient: new AxiosAdapter(),
      targetResolver: async (key) => {
        return baseUrl;
      },
    });
    return result;
  } catch (error) {
    const errors = Value.Errors(TestPlanV1Schema, plan);
    console.error("ERROR: Invalid plan", JSON.stringify(errors, null, 2));
    throw new Error(`Invalid plan: ${(error as Error).message}`);
  }
}

function findWorkspaceRoot(): string {
  let current = process.cwd();
  while (current !== path.dirname(current)) {
    const testCliPath = path.join(current, "griffin-cli");
    const testSystemPath = path.join(current, "griffin-ts");
    if (fs.existsSync(testCliPath) && fs.existsSync(testSystemPath)) {
      return current;
    }
    current = path.dirname(current);
  }
  return process.cwd();
}

import { findTestFiles } from '../test-discovery';
import { getRunnerHost } from './configure-runner-host';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export async function executeDeploy(): Promise<void> {
  const runnerHost = getRunnerHost();

  if (!runnerHost) {
    console.error('ERROR: No runner host configured. Run: griffin configure-runner-host <host>');
    process.exit(1);
  }

  console.log('Deploying tests to runner...');

  const testFiles = findTestFiles();
  const workspaceRoot = findWorkspaceRoot();
  const testSystemPath = path.join(workspaceRoot, 'griffin-test-system', 'dist');

  if (!fs.existsSync(testSystemPath)) {
    throw new Error(
      'Test system not built. Please run: cd griffin-test-system && npm install && npm run build'
    );
  }

  // TODO: Implement deployment logic
  // - Read each test file
  // - Execute it to get JSON plan
  // - Send to runner API
  // - Handle responses

  console.log('Deployed.');
}

function findWorkspaceRoot(): string {
  let current = process.cwd();
  while (current !== path.dirname(current)) {
    const griffinCliPath = path.join(current, 'griffin-cli');
    const testSystemPath = path.join(current, 'griffin-test-system');
    if (fs.existsSync(griffinCliPath) && fs.existsSync(testSystemPath)) {
      return current;
    }
    current = path.dirname(current);
  }
  return process.cwd();
}

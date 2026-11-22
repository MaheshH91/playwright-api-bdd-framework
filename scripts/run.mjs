/**
 * Test runner wrapper: runs cucumber-js (forwarding any extra CLI args such
 * as --tags or --parallel), then always generates the HTML report even when
 * scenarios fail, and finally exits with cucumber's exit code.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportsDir = path.join(projectRoot, 'reports');

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// @cucumber/cucumber >= v13 does not export ./bin/* in its "exports" map,
// so resolve the package root and join the bin entry manually.
const cucumberBin = path.join(
  path.dirname(require.resolve('@cucumber/cucumber/package.json')),
  'bin',
  'cucumber.js'
);

const extraArgs = process.argv.slice(2);

const result = spawnSync(process.execPath, [cucumberBin, ...extraArgs], {
  stdio: 'inherit',
  cwd: projectRoot
});

try {
  await import('./generate-report.mjs');
} catch (error) {
  console.error(`[report] Failed to generate HTML report: ${error.message}`);
}

process.exit(result.status === null ? 1 : result.status);

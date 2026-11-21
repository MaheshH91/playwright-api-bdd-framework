/**
 * Generates a standalone HTML report from reports/cucumber-report.json
 * using multiple-cucumber-html-reporter (ESM-only since v4, hence import()).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const jsonDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'reports');
const jsonFile = path.join(jsonDir, 'cucumber-report.json');

if (!fs.existsSync(jsonFile)) {
  console.log('[report] No reports/cucumber-report.json found - run "npm test" first.');
  process.exit(0);
}

const report = await import('multiple-cucumber-html-reporter');

let playwrightVersion = 'n/a';
try {
  playwrightVersion = require('@playwright/test/package.json').version;
} catch {
  // Deep import blocked - not critical, keep the fallback.
}

await report.generate({
  jsonDir,
  reportPath: path.join(jsonDir, 'html'),
  pageTitle: 'Playwright API BDD Framework',
  reportName: 'API Test Results',
  displayDuration: true,
  metadata: {
    browser: { name: 'Playwright request API', version: playwrightVersion },
    device: 'HTTP client (no browser needed)',
    platform: { name: os.type(), version: os.release() }
  },
  customData: {
    title: 'Run info',
    data: [
      { label: 'Project', value: 'Playwright + Cucumber API BDD framework (DDF)' },
      { label: 'Environment', value: process.env.API_ENV || 'qa' },
      { label: 'Generated', value: new Date().toLocaleString() }
    ]
  }
});

console.log('[report] HTML report generated: reports/html/index.html');

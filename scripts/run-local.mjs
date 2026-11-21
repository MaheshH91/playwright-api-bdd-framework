/**
 * Runs the suite against the local mock server (scripts/../mock-server):
 *  1. starts mock-server/server.js
 *  2. waits for it to accept connections
 *  3. runs cucumber with API_ENV=local and BASE_URL pointing at the mock
 *  4. stops the server, propagates cucumber's exit code
 */
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 3000);
const baseUrl = `http://localhost:${port}`;

const server = spawn(process.execPath, [path.join(projectRoot, 'mock-server', 'server.js')], {
  env: { ...process.env, PORT: String(port) },
  stdio: 'ignore'
});

const isUp = async () => {
  try {
    await fetch(`${baseUrl}/api/users/2`, { signal: AbortSignal.timeout(1000) });
    return true;
  } catch {
    return false;
  }
};

let ready = false;
for (let i = 0; i < 50 && !ready; i++) {
  ready = await isUp();
  if (!ready) await new Promise(resolve => setTimeout(resolve, 200));
}

if (!ready) {
  console.error(`[test:local] Mock server did not become ready on ${baseUrl}`);
  server.kill();
  process.exit(1);
}

console.log(`[test:local] Mock server ready on ${baseUrl}`);

const result = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', 'run.mjs')], {
  stdio: 'inherit',
  cwd: projectRoot,
  env: { ...process.env, API_ENV: 'local', BASE_URL: baseUrl }
});

server.kill();
process.exit(result.status === null ? 1 : result.status);

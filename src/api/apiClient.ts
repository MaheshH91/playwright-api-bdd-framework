import { getConfig } from '../config/envConfig';
import { logger } from '../utils/logger';
import { interpolate } from '../utils/helpers';
import { ApiWorld } from '../support/world';

/**
 * Sends an HTTP request through the Playwright API request context and
 * records everything the step definitions need for assertions:
 * response object, parsed body, elapsed time and the effective URL.
 */
export async function sendRequest(
  world: ApiWorld,
  method: string,
  endpoint: string,
  payload?: unknown
): Promise<void> {
  const context = await world.ensureContext();
  const config = getConfig(world.activeEnv);
  const normalizedMethod = method.toUpperCase();
  const url = interpolate(endpoint, world.storedValues);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    method: normalizedMethod,
    headers: { ...world.extraHeaders },
    timeout: config.timeout
  };
  if (payload !== undefined && normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD') {
    options.data = payload;
  }

  const start = Date.now();
  const response = await context.fetch(url, options);
  world.responseTimeMs = Date.now() - start;
  world.response = response;
  world.lastRequest = { method: normalizedMethod, url };

  const text = await response.text();
  if (text) {
    try {
      world.responseBody = JSON.parse(text);
    } catch {
      world.responseBody = text;
    }
  } else {
    world.responseBody = null;
  }

  logger.step(`${normalizedMethod} ${url} -> ${response.status()} (${world.responseTimeMs}ms)`);
}

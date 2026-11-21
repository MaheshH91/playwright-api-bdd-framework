import { World } from '@cucumber/cucumber';
import { APIRequestContext, APIResponse, request } from '@playwright/test';
import { getConfig } from '../config/envConfig';
import { Dataset } from '../utils/testDataLoader';

/**
 * Custom Cucumber World holding all per-scenario state:
 *  - the Playwright API request context (created lazily per environment)
 *  - the last response, parsed body and measured response time
 *  - the currently loaded DDF dataset (payload + expectations)
 *  - stored values that can be interpolated into later requests ({{token}} etc.)
 */
export class ApiWorld extends World {
  activeEnv: string = process.env.API_ENV || 'qa';
  context?: APIRequestContext;
  response?: APIResponse;
  responseBody: unknown = null;
  dataset?: Dataset;
  extraHeaders: Record<string, string> = {};
  storedValues: Record<string, string> = {};
  responseTimeMs = 0;
  lastRequest?: { method: string; url: string };

  /** Switches the target environment and drops any existing request context. */
  async setEnvironment(env: string): Promise<void> {
    const config = getConfig(env); // throws on unknown environments
    this.activeEnv = config.name;
    await this.context?.dispose();
    this.context = undefined;
  }

  /** Lazily creates the Playwright API request context for the active env. */
  async ensureContext(): Promise<APIRequestContext> {
    if (!this.context) {
      const config = getConfig(this.activeEnv);
      this.context = await request.newContext({
        baseURL: config.baseUrl,
        extraHTTPHeaders: config.defaultHeaders,
        timeout: config.timeout
      });
    }
    return this.context;
  }
}

import { After, Before, Status, setWorldConstructor } from '@cucumber/cucumber';
import { logger } from '../utils/logger';
import { ApiWorld } from './world';

setWorldConstructor(ApiWorld);

Before(async function (this: ApiWorld) {
  this.activeEnv = process.env.API_ENV || 'qa';
});

After(async function (this: ApiWorld, { result, pickle }: { result?: { status: string }; pickle?: { name: string } }) {
  const failed =
    result && result.status !== Status.PASSED && result.status !== Status.SKIPPED;

  if (failed && this.lastRequest) {
    this.attach(
      [
        `Scenario : ${pickle?.name ?? '<unknown>'}`,
        `Request  : ${this.lastRequest.method} ${this.lastRequest.url}`,
        `Status   : ${this.response ? this.response.status() : 'n/a'}`,
        `Body     : ${JSON.stringify(this.responseBody, null, 2)}`
      ].join('\n'),
      'text/plain'
    );
    logger.error(`Scenario failed after: ${this.lastRequest.method} ${this.lastRequest.url} -> ${this.response?.status()}`);
  } else if (this.lastRequest) {
    logger.success(`Scenario passed: ${pickle?.name ?? ''}`);
  }

  await this.context?.dispose();
});

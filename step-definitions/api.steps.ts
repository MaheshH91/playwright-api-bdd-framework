import * as assert from 'assert';
import { Given, Then, When } from '@cucumber/cucumber';
import * as fs from 'fs';
import * as path from 'path';
import { ApiWorld } from '../src/support/world';
import { sendRequest } from '../src/api/apiClient';
import { getConfig } from '../src/config/envConfig';
import { interpolate, getValueByPath } from '../src/utils/helpers';
import { logger } from '../src/utils/logger';
import { ANY_VALUE, Dataset, loadCsvDataset, loadDataset } from '../src/utils/testDataLoader';
import { validateSchema } from '../src/utils/schemaValidator';

/*
 * ------------------------------------------------------------------
 * Given
 * ------------------------------------------------------------------
 */

Given('the API is targeting the {string} environment', async function (this: ApiWorld, env: string) {
  await this.setEnvironment(env);
  logger.info(`Environment set to "${env}" (${getConfig(env).baseUrl})`);
});

/*
 * ------------------------------------------------------------------
 * When - data loading (DDF)
 * ------------------------------------------------------------------
 */

When('I load the dataset {string} from {string}', function (this: ApiWorld, datasetName: string, fileName: string) {
  this.dataset = loadDataset(fileName, datasetName);
  logger.info(`Loaded dataset "${datasetName}" from ${fileName}`);
});

When(
  'I load the CSV dataset from row {int} of {string}',
  function (this: ApiWorld, rowNumber: number, fileName: string) {
    this.dataset = loadCsvDataset(fileName, rowNumber);
    logger.info(`Loaded CSV row ${rowNumber} from ${fileName}`);
  }
);

/*
 * ------------------------------------------------------------------
 * When - requests
 * ------------------------------------------------------------------
 */

When('I send a {string} request to {string}', async function (this: ApiWorld, method: string, endpoint: string) {
  await sendRequest(this, method, endpoint);
});

When(
  'I send a {string} request to {string} with the loaded payload',
  async function (this: ApiWorld, method: string, endpoint: string) {
    if (!this.dataset?.payload) {
      throw new Error('No dataset payload loaded - use a "I load ..." step first.');
    }
    await sendRequest(this, method, endpoint, this.dataset.payload);
  }
);

When('I set the {string} header to {string}', function (this: ApiWorld, name: string, value: string) {
  this.extraHeaders[name] = interpolate(value, this.storedValues);
  logger.info(`Header ${name} set for subsequent requests`);
});

When(
  'I store the response field {string} as {string}',
  function (this: ApiWorld, fieldPath: string, variableName: string) {
    const value = getValueByPath(this.responseBody, fieldPath);
    assert.ok(
      value !== undefined && value !== null,
      `Cannot store field "${fieldPath}": not present in the last response body.`
    );
    this.storedValues[variableName] = String(value);
    logger.info(`Stored response field "${fieldPath}" as {{${variableName}}}`);
  }
);

Then('the stored variable {string} should not be empty', function (this: ApiWorld, variableName: string) {
  const value = this.storedValues[variableName];
  assert.ok(value !== undefined && value.trim() !== '', `Stored variable "${variableName}" is missing or empty.`);
});

/*
 * ------------------------------------------------------------------
 * Then - status / timing
 * ------------------------------------------------------------------
 */

Then('the response status code should be {int}', function (this: ApiWorld, expected: number) {
  const actual = this.response?.status();
  assert.strictEqual(actual, expected, `Expected status ${expected} but got ${actual}.`);
});

Then(
  'the response status code should be the expected status',
  function (this: ApiWorld) {
    const expected = this.dataset?.expected?.status;
    if (expected === undefined) {
      throw new Error('The loaded dataset has no expected status (missing "expected.status" / "expected_status").');
    }
    const actual = this.response?.status();
    assert.strictEqual(actual, expected, `Expected status ${expected} but got ${actual}.`);
  }
);

Then('the response time should be below {int} ms', function (this: ApiWorld, maxMs: number) {
  assert.ok(
    this.responseTimeMs < maxMs,
    `Response took ${this.responseTimeMs}ms - expected below ${maxMs}ms.`
  );
});

/*
 * ------------------------------------------------------------------
 * Then - body assertions
 * ------------------------------------------------------------------
 */

Then('the response field {string} should be {string}', function (this: ApiWorld, fieldPath: string, expected: string) {
  const actual = getValueByPath(this.responseBody, fieldPath);
  assert.ok(actual !== undefined, `Field "${fieldPath}" is missing from the response body.`);
  assert.strictEqual(String(actual), expected, `Field "${fieldPath}" mismatch.`);
});

Then('the response field {string} should not be empty', function (this: ApiWorld, fieldPath: string) {
  const actual = getValueByPath(this.responseBody, fieldPath);
  assert.ok(actual !== undefined, `Field "${fieldPath}" is missing from the response body.`);
  assert.ok(actual !== null && String(actual).trim() !== '', `Field "${fieldPath}" is empty.`);
});

Then(
  'the response should contain the expected fields',
  function (this: ApiWorld) {
    const expectedFields = this.dataset?.expected?.fields;
    if (!expectedFields) {
      throw new Error('The loaded dataset has no expected fields (missing "expected.fields" / "expected_<field>" columns).');
    }
    for (const [fieldPath, expectedValue] of Object.entries(expectedFields)) {
      const actual = getValueByPath(this.responseBody, fieldPath);
      if (expectedValue === ANY_VALUE) {
        assert.ok(
          actual !== undefined && actual !== null && String(actual).trim() !== '',
          `Field "${fieldPath}" should exist and be non-empty, but was ${JSON.stringify(actual)}.`
        );
      } else {
        assert.ok(actual !== undefined, `Field "${fieldPath}" is missing from the response body.`);
        assert.strictEqual(
          String(actual),
          String(expectedValue),
          `Field "${fieldPath}" mismatch (dataset expectation).`
        );
      }
    }
  }
);

Then(
  'the response should match the {string} schema',
  function (this: ApiWorld, schemaName: string) {
    const schemaPath = path.join(process.cwd(), 'schemas', `${schemaName}.json`);
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: schemas/${schemaName}.json`);
    }
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    const errors: string[] = validateSchema(this.responseBody, schema);
    assert.deepStrictEqual(errors, [], `Schema validation failed:\n${errors.join('\n')}`);
  }
);

/*
 * ------------------------------------------------------------------
 * Then - chained DDF assertion helper
 * ------------------------------------------------------------------
 */

/**
 * Convenience export so custom/business step definitions can assert a full
 * Dataset expectation (status + fields) in one call when they build steps
 * around domain-specific endpoints.
 */
export function assertDatasetExpectations(world: ApiWorld, dataset: Dataset): void {
  world.dataset = dataset;
}

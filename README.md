# Playwright API BDD Framework (DDF + Cucumber)

API testing framework combining **Playwright's request API** (HTTP client, no browser needed), **Cucumber BDD** (Gherkin features), and **data-driven testing (DDF)** via external JSON/CSV datasets with expected results.

Targets the [reqres.in](https://reqres.in) demo API out of the box — swap `BASE_URL` to point at any API.

## Project structure

```
├── features/                  Gherkin feature files
│   ├── users.feature          Lookup, listing, Scenario Outline (DDF), negative
│   ├── user-crud.feature      POST/PUT/PATCH/DELETE driven by datasets
│   └── auth.feature           Login datasets + token capture/reuse
├── step-definitions/
│   └── api.steps.ts           Reusable generic BDD steps
├── src/
│   ├── api/apiClient.ts       Request sender (logging, timing, body parsing)
│   ├── config/envConfig.ts    Per-environment baseUrl/timeout/headers
│   ├── support/world.ts       ApiWorld: per-scenario state (World object)
│   ├── support/hooks.ts       Before/After hooks, failure attachments
│   └── utils/                 interpolation, JSON path, CSV/JSON loaders, schema validator, logger
├── test-data/                 DDF datasets (payloads + expected results)
│   ├── users/create-users.json
│   ├── users/update-users.json + update-users.csv
│   └── auth/login.json
├── mock-server/               Dependency-free local mock of the reqres API (test:local)
├── schemas/                   Lightweight JSON schemas for response validation
├── scripts/                   run.mjs (runner), generate-report.mjs (HTML report)
└── reports/html/index.html    Generated HTML report
```

## Setup

```bash
npm install
```

No browser download required — the framework only uses Playwright's HTTP client.

## Running tests

```bash
npm test                    # full suite against reqres.in (always regenerates the HTML report)
npm run test:local          # full suite against the built-in local mock server (deterministic, no quota)
npm run test:smoke          # @smoke scenarios only
npm run test:regression     # @regression scenarios only
npm run test:negative       # @negative scenarios only
npm run test:parallel       # 3 parallel workers
npm run mock                # start the local mock server standalone (port 3000)
npm run report              # regenerate HTML report from last JSON run
```

Extra cucumber args pass through, e.g. `node scripts/run.mjs --tags "@users and not @negative"`.

### Environment / configuration

| Env var      | Default             | Purpose                          |
|--------------|---------------------|----------------------------------|
| `API_ENV`    | `qa`                | Environment key (`qa`/`prod`/`local`) |
| `BASE_URL`   | per environment map | Override target API base URL     |
| `API_KEY`    | `reqres-free-v1`    | Sent as `x-api-key` header       |
| `TIMEOUT_MS` | `10000`             | Request timeout                  |

Example: `API_ENV=qa npm test`

## Data-driven testing (DDF)

Two mechanisms, both external to the code:

**1. JSON datasets** — `When I load the dataset "valid_user" from "users/create-users.json"`.
The file holds named datasets with a `payload` and an `expected` block:

```json
{
  "name": "valid_user",
  "payload": { "name": "morpheus", "job": "leader" },
  "expected": { "status": 201, "fields": { "name": "morpheus", "job": "leader" } }
}
```

Asserted with `Then the response status code should be the expected status` and
`Then the response should contain the expected fields`. Use `"__ANY__"` as an
expectation value to assert "field exists and is non-empty".

**2. CSV rows** — `When I load the CSV dataset from row 1 of "users/update-users.csv"`.
Columns starting with `expected_` become expectations (`expected_status`,
`expected_job` → field `job`); empty expected value means "must exist";
all other columns become the request payload.

Field expectations use dotted paths with array support:
`data.email`, `data[0].id`, `data.length`.

## Key BDD steps (cheat sheet)

```gherkin
Given the API is targeting the "qa" environment

When I load the dataset "valid_user" from "users/create-users.json"
When I load the CSV dataset from row 1 of "users/update-users.csv"
When I send a "GET" request to "/api/users/2"
When I send a "POST" request to "/api/users" with the loaded payload
When I set the "Authorization" header to "Bearer {{authToken}}"
When I store the response field "token" as "authToken"

Then the response status code should be 200
Then the response status code should be the expected status
Then the response time should be below 1000 ms
Then the response field "data.id" should be "2"
Then the response field "data.email" should not be empty
Then the response should contain the expected fields
Then the response should match the "user-detail" schema
Then the stored variable "authToken" should not be empty
```

`{{placeholder}}` values interpolate from previously stored variables; responses
are attached to failed scenarios automatically for debugging.

## Reports

After every run: **[reports/html/index.html](reports/html/index.html)** — standalone HTML report (multiple-cucumber-html-reporter) with scenario details, durations, failure attachments, and run metadata.

## Extending

- **New endpoint/service**: add a feature file + datasets; the generic steps usually suffice. For domain-specific steps, import `sendRequest` and the `ApiWorld` helpers.
- **New environment**: add an entry to `ENVIRONMENTS` in `src/config/envConfig.ts`.
- **Schema validation**: drop a schema in `schemas/<name>.json` (subset: `type`, `required`, `properties`, `items`).

## Notes

- TypeScript is pinned to 5.4.x because `ts-node` does not support TypeScript 7 (the native compiler).
- Formatters: cucumber's built-in `summary` + `json` — `@cucumber/pretty-formatter` 4.x has no default export and is incompatible with cucumber v13's formatter loader.
- The reqres.in keyless demo is rate-limited; a `429` failure usually means the shared quota was hit, not a test bug. Register a free key and pass `API_KEY=<your key>` for more headroom.

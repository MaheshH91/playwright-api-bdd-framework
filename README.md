# Playwright API BDD Framework (DDF + Cucumber)

API testing framework combining **Playwright's request API** (HTTP client, no browser needed), **Cucumber BDD** (Gherkin features), and **data-driven testing (DDF)** via external JSON/CSV datasets with expected results.

Targets the [reqres.in](https://reqres.in) demo API out of the box — swap `BASE_URL` to point at any API, or run self-contained against the built-in local mock server in CI/CD.

## Project structure

```
├── .github/workflows/
│   └── api-tests.yml          GitHub Actions CI/CD workflow (manual dispatch + PR/push)
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
├── scripts/                   run.mjs (runner), run-local.mjs, generate-report.mjs (HTML report)
├── reports/                   Generated HTML, JSON, and JUnit XML reports
├── Jenkinsfile                Declarative Jenkins pipeline with parameters & report publishing
├── Dockerfile                 Lightweight Node 22 Alpine image for containerized CI agents
└── cucumber.js                Cucumber configuration (summary, JSON, and JUnit formatters)
```

## Setup

```bash
npm ci
```

No browser download required — the framework only uses Playwright's HTTP client (`APIRequestContext`) on Node.js 22+.

## Running tests

```bash
npm test                    # full suite against reqres.in (always regenerates reports)
npm run test:local          # full suite against the built-in local mock server (deterministic, no quota)
npm run test:ci             # local mock server + 3 parallel workers (default CI command)
npm run test:smoke          # @smoke scenarios only
npm run test:regression     # @regression scenarios only
npm run test:negative       # @negative scenarios only
npm run test:parallel       # 3 parallel workers
npm run typecheck           # TypeScript strict type check (tsc --noEmit)
npm run mock                # start the local mock server standalone (port 3000)
npm run report              # regenerate HTML report from last JSON run
```

Extra Cucumber CLI args pass through to both `run.mjs` and `run-local.mjs`, e.g.:
```bash
node scripts/run-local.mjs --tags "@users and not @negative" --parallel 2
```

### Environment / configuration

| Env var      | Default             | Purpose                               |
|--------------|---------------------|---------------------------------------|
| `API_ENV`    | `qa`                | Environment key (`qa`/`prod`/`local`) |
| `BASE_URL`   | per environment map | Override target API base URL          |
| `API_KEY`    | `reqres-free-v1`    | Sent as `x-api-key` header            |
| `TIMEOUT_MS` | `10000`             | Request timeout in milliseconds       |

Example: `API_ENV=qa npm test`

## CI/CD Integration

This repository is ready out of the box for both **GitHub Actions** and **Jenkins**. Both pipelines default to `API_ENV=local` (using `mock-server/server.js`) so CI builds remain fast, deterministic, and immune to external API rate limits (`429`), while allowing on-demand execution against `qa` or `prod`.

### 1. GitHub Actions (`.github/workflows/api-tests.yml`)

- **Triggers**:
  - Automatic on `push` and `pull_request` to `main`, `master`, or `develop` (runs against `local` mock server with 3 parallel workers).
  - Manual via **Actions → API BDD Test Suite → Run workflow**, allowing you to select `environment` (`local` / `qa` / `prod`), `tags` (e.g., `@smoke`), and `workers`.
- **Pipeline Steps**:
  1. Checks out code and sets up **Node.js 22** with npm caching.
  2. Installs dependencies (`npm ci`) and runs `npm run typecheck`.
  3. Executes Cucumber tests and generates HTML, JSON, and JUnit XML reports.
  4. Publishes inline PR/commit test annotations via `mikepenz/action-junit-report` (`reports/junit-report.xml`).
  5. Uploads the full `reports/` directory as a workflow artifact (`api-test-reports-<run_number>`).
- **Optional Repository Configuration**:
  - **Secret**: `API_KEY` — custom API key when targeting live `qa`/`prod` environments.
  - **Variables**: `BASE_URL`, `TIMEOUT_MS` — optional overrides.

### 2. Jenkins (`Jenkinsfile`)

- **Pipeline Parameters** (available via *Build with Parameters*):
  - `API_ENV`: `local` (default), `qa`, or `prod`.
  - `TAGS`: Cucumber tag expression (e.g., `@smoke`, `@regression`, `@users and not @negative`).
  - `PARALLEL_WORKERS`: Number of parallel workers (default `3`).
  - `BASE_URL_OVERRIDE`: Optional URL override.
- **Jenkins Prerequisites & Plugins**:
  1. **NodeJS Plugin**: Configure a Node.js 22 installation named `NodeJS-22` under *Manage Jenkins → Tools* (or adjust the `tools` block in `Jenkinsfile` / run inside the provided `Dockerfile`).
  2. **JUnit Plugin**: Automatically parses `reports/junit-report.xml` for build test trends.
  3. **HTML Publisher Plugin**: Publishes `reports/html/index.html` directly on the Jenkins job dashboard as **Cucumber API HTML Report**.
  4. **Credentials (Optional)**: Add a *Secret text* credential with ID `reqres-api-key` in *Manage Jenkins → Credentials* (or remove the `API_KEY = credentials(...)` line if not using live external keys).

### 3. Docker Execution (Optional)

Run the entire suite inside a self-contained Node 22 Alpine container without installing Node locally on CI agents:

```bash
docker build -t playwright-api-bdd .
docker run --rm -v "$(pwd)/reports:/app/reports" playwright-api-bdd
```

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

After every run, three report formats are produced in `reports/`:
- **`reports/html/index.html`** — Standalone HTML report (`multiple-cucumber-html-reporter`) with scenario details, durations, failure attachments, and run metadata.
- **`reports/cucumber-report.json`** — Raw Cucumber JSON output.
- **`reports/junit-report.xml`** — JUnit XML report consumed by Jenkins and GitHub Actions test result publishers.

## Extending

- **New endpoint/service**: add a feature file + datasets; the generic steps usually suffice. For domain-specific steps, import `sendRequest` and the `ApiWorld` helpers.
- **New environment**: add an entry to `ENVIRONMENTS` in `src/config/envConfig.ts`.
- **Schema validation**: drop a schema in `schemas/<name>.json` (subset: `type`, `required`, `properties`, `items`).

## Notes

- **Node.js Engine**: `@cucumber/cucumber` v13 and `multiple-cucumber-html-reporter` v4 require **Node.js 22+**.
- **TypeScript**: Pinned to `5.4.x` because `ts-node` does not support TypeScript 7.
- **Formatters**: Uses Cucumber's built-in `summary`, `json`, and `junit` formatters (`@cucumber/pretty-formatter` 4.x is incompatible with Cucumber v13's formatter loader).
- **Rate Limits**: The `reqres.in` keyless demo is rate-limited; a `429` failure usually means the shared quota was hit, not a test bug. Use `npm run test:local` for deterministic CI runs or register a free key and pass `API_KEY=<your key>`.


export interface EnvConfig {
  name: string;
  baseUrl: string;
  timeout: number;
  defaultHeaders: Record<string, string>;
}

const ENVIRONMENTS: Record<string, { baseUrl: string }> = {
  qa: { baseUrl: 'https://reqres.in' },
  prod: { baseUrl: 'https://reqres.in' },
  local: { baseUrl: 'http://localhost:3000' }
};

/**
 * Resolves the configuration for a given environment name.
 * Priority: BASE_URL env var > environment map > "qa" fallback.
 */
export function getConfig(env?: string): EnvConfig {
  const name = (env || process.env.API_ENV || 'qa').toLowerCase();
  const entry = ENVIRONMENTS[name];
  if (!entry) {
    throw new Error(`Unknown environment "${name}". Available: ${Object.keys(ENVIRONMENTS).join(', ')}`);
  }
  return {
    name,
    baseUrl: process.env.BASE_URL || entry.baseUrl,
    timeout: Number(process.env.TIMEOUT_MS || 10000),
    // reqres.in's documented demo key; override with the API_KEY env var.
    defaultHeaders: { Accept: 'application/json', 'x-api-key': process.env.API_KEY || 'reqres-free-v1' }
  };
}

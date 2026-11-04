import { COUNTRY_CODES, DEFAULT_REGION } from './constants.js';

const DEFAULT_PORT = 7100;
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 12_000;

export function loadConfig(env = process.env) {
  const parsedPort = Number.parseInt(env.PORT ?? '', 10);
  const cacheTtlMs = Number.parseInt(env.CACHE_TTL_MS ?? '', 10);
  const timeoutMs = Number.parseInt(env.JUSTWATCH_TIMEOUT_MS ?? '', 10);
  const region = String(env.REGION ?? '').trim().toUpperCase();

  return {
    port:
      Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort < 65536
        ? parsedPort
        : DEFAULT_PORT,
    publicUrl: normalizeUrl(env.PUBLIC_URL || env.RENDER_EXTERNAL_URL),
    region: COUNTRY_CODES.has(region) ? region : DEFAULT_REGION,
    cacheTtlMs:
      Number.isInteger(cacheTtlMs) && cacheTtlMs >= 30_000
        ? cacheTtlMs
        : DEFAULT_CACHE_TTL_MS,
    justwatchEndpoint: normalizeUrl(env.JUSTWATCH_ENDPOINT) || 'https://apis.justwatch.com/graphql',
    requestTimeoutMs:
      Number.isInteger(timeoutMs) && timeoutMs >= 1_000 ? timeoutMs : DEFAULT_TIMEOUT_MS,
  };
}

function normalizeUrl(value) {
  return String(value ?? '').trim().replace(/\/+$/, '');
}

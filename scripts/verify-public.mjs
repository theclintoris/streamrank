import { encodeConfig } from '../src/config-token.js';

const baseUrl = (process.argv[2] || 'https://streamrank-pgs1.onrender.com').replace(/\/+$/, '');
let failures = 0;

function check(condition, label, detail = '') {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

async function getJson(path, timeoutMs = 90_000) {
  const response = await fetch(`${baseUrl}${path}`, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'application/json' },
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

console.log(`StreamRank public verification: ${baseUrl}\n`);

const health = await getJson('/healthz');
check(health.response.ok && health.body?.ok === true, 'health endpoint', health.body?.version);
check(health.body?.services?.length === 7, 'health reports 7 services');

const manifest = await getJson('/manifest.json');
const catalogs = manifest.body?.catalogs ?? [];
check(manifest.response.ok, 'manifest HTTP 200');
check(catalogs.length === 14, 'manifest has 14 catalogs', String(catalogs.length));
check(String(manifest.body?.logo).startsWith(`${baseUrl}/`), 'manifest logo uses public origin');

const expected = new Map(catalogs.map((catalog) => [`${catalog.type}:${catalog.id}`, catalog]));
const services = ['netflix', 'hulu', 'disney', 'apple', 'paramount', 'hbo', 'prime'];
for (const service of services) {
  for (const type of ['movie', 'series']) {
    const key = `${type === 'movie' ? 'movie' : 'series'}:${service}-${type === 'movie' ? 'movie' : 'series'}`;
    check(expected.has(key), `manifest includes ${service} ${type}`);
  }
}

let totalMetas = 0;
for (const catalog of catalogs) {
  const path = `/catalog/${catalog.type}/${catalog.id}.json`;
  try {
    const { response, body } = await getJson(path);
    const metas = body?.metas ?? [];
    const valid = metas.every(
      (meta) =>
        meta &&
        typeof meta.id === 'string' &&
        typeof meta.name === 'string' &&
        typeof meta.poster === 'string' &&
        meta.poster.startsWith('https://') &&
        (meta.type === catalog.type || meta.type === undefined),
    );
    totalMetas += metas.length;
    check(
      response.ok && metas.length > 0 && valid,
      `${catalog.name}`,
      `${metas.length} metas${valid ? '' : ', invalid metadata'}`,
    );
  } catch (error) {
    failures += 1;
    console.log(`FAIL  ${catalog.name} — ${error.message}`);
  }
}
check(totalMetas >= 14 * 40, 'all catalogs populated', `${totalMetas} total metas`);

try {
  const path = '/catalog/movie/netflix-movie/genre=action&year=2020s&rating=8.0.json';
  const { response, body } = await getJson(path);
  const metas = body?.metas ?? [];
  const valid = metas.every(
    (meta) =>
      Number(meta.imdbRating) >= 8 &&
      Number(meta.releaseInfo) >= 2020 &&
      (meta.genres ?? []).some((genre) => genre.toLowerCase() === 'action'),
  );
  check(response.ok && metas.length > 0 && valid, 'path filters: Netflix action 2020s 8.0+', `${metas.length} metas`);
} catch (error) {
  failures += 1;
  console.log(`FAIL  path filters — ${error.message}`);
}

try {
  const token = encodeConfig({
    services: ['hbo'],
    types: ['series'],
    genre: 'drm',
    minRating: 8.5,
    sort: 'rating',
    region: 'US',
  });
  const { response, body } = await getJson(`/c/${token}/manifest.json`);
  const configured = body?.catalogs ?? [];
  const catalog = configured[0];
  const catalogResponse = await getJson(`/c/${token}/catalog/series/${catalog?.id}.json`);
  const metas = catalogResponse.body?.metas ?? [];
  check(response.ok, 'configured manifest HTTP 200');
  check(configured.length === 1 && catalog?.type === 'series', 'configured manifest has one HBO series catalog');
  check(metas.length > 0 && metas.every((meta) => meta.type === 'series'), 'configured catalog returns series', `${metas.length} metas`);
} catch (error) {
  failures += 1;
  console.log(`FAIL  configured manifest — ${error.message}`);
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exitCode = failures === 0 ? 0 : 1;

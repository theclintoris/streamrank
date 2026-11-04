import assert from 'node:assert/strict';
import { encodeConfig } from '../src/config-token.js';

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:7100';

async function getJson(path) {
  const response = await fetch(`${base}${path}`);
  const body = await response.json().catch(() => null);
  assert.equal(response.status, 200, `${path} returned ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

const health = await getJson('/healthz');
assert.equal(health.ok, true);

const manifest = await getJson('/manifest.json');
assert.equal(manifest.catalogs.length, 14);
assert.deepEqual(manifest.types, ['movie', 'series']);
assert.deepEqual(
  manifest.catalogs[0].extra.map((extra) => extra.name),
  ['genre', 'year', 'rating', 'sort', 'skip'],
);

const plain = await getJson('/catalog/movie/netflix-movie.json');
assert.equal(plain.metas.length, 50);
assert.ok(plain.metas.every((meta) => meta.id && meta.name && meta.type === 'movie'));

const filtered = await getJson(
  '/catalog/movie/netflix-movie.json?genre=Action&year=2020s&rating=8.0%2B&sort=IMDb%20Rating',
);
assert.ok(filtered.metas.length > 0, 'filtered catalog should not be empty');
for (const meta of filtered.metas) {
  assert.ok(Number(meta.releaseInfo) >= 2020, `${meta.name} is outside the 2020s`);
  assert.ok(Number(meta.imdbRating) >= 8, `${meta.name} is below 8.0`);
  assert.ok(meta.genres.includes('Action'), `${meta.name} is not action`);
}
const scores = filtered.metas.map((meta) => Number(meta.imdbRating));
assert.deepEqual(scores, [...scores].sort((a, b) => b - a), 'IMDb rating sort is descending');

const page2 = await getJson('/catalog/movie/netflix-movie/genre=Action&skip=10.json');
assert.equal(page2.metas.length, 50);
assert.notEqual(page2.metas[0].id, plain.metas[0].id);

const pathFiltered = await getJson('/catalog/movie/netflix-movie/genre=Action&rating=8.0%2B.json');
assert.ok(pathFiltered.metas.length > 0, 'path-style rating filter should not be empty');
assert.ok(
  pathFiltered.metas.every((meta) => Number(meta.imdbRating) >= 8),
  'path-style 8.0+ rating filter should be applied',
);

const token = encodeConfig({
  services: ['hbo'],
  types: ['series'],
  genre: 'drm',
  yearFrom: 2015,
  yearTo: 2024,
  minRating: 8,
  sort: 'rating',
  region: 'GB',
});
const configuredManifest = await getJson(`/c/${token}/manifest.json`);
assert.equal(configuredManifest.catalogs.length, 1);
assert.equal(configuredManifest.catalogs[0].type, 'series');
assert.match(configuredManifest.catalogs[0].name, /HBO Max · Shows · Drama · 2015–2024 · 8\.0\+ · IMDb Rating/);

const configured = await getJson(`/c/${token}/catalog/series/hbo-series.json`);
assert.ok(configured.metas.length > 0, 'configured catalog should not be empty');
for (const meta of configured.metas) {
  const year = Number(meta.releaseInfo);
  assert.ok(year >= 2015 && year <= 2024, `${meta.name} is outside 2015–2024`);
  assert.ok(Number(meta.imdbRating) >= 8, `${meta.name} is below 8.0`);
  assert.ok(meta.genres.includes('Drama'), `${meta.name} is not drama`);
}

console.log(
  JSON.stringify(
    {
      health: health.ok,
      defaultCatalogs: manifest.catalogs.length,
      netflixMovies: plain.metas.length,
      filteredAction2020s8plus: filtered.metas.length,
      pathFiltered8plus: pathFiltered.metas.length,
      configuredHboDramas: configured.metas.length,
      sample: configured.metas.slice(0, 3).map((meta) => `${meta.name} (${meta.releaseInfo}) ${meta.imdbRating}`),
    },
    null,
    2,
  ),
);

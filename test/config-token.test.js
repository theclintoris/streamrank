import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ConfigTokenError,
  decodeConfig,
  defaultConfig,
  encodeConfig,
  filtersActive,
  isDefaultConfig,
  normalizeConfig,
} from '../src/config-token.js';
import { SERVICE_KEYS } from '../src/constants.js';

test('normalizes a sparse config to canonical defaults', () => {
  assert.deepEqual(defaultConfig(), {
    services: [...SERVICE_KEYS],
    types: ['movie', 'series'],
    genre: null,
    yearFrom: null,
    yearTo: null,
    minRating: null,
    sort: 'popular',
    region: 'US',
  });
  assert.equal(isDefaultConfig({}), true);
  assert.equal(filtersActive({}), false);
});

test('canonicalizes order, names and ranges', () => {
  const config = normalizeConfig({
    services: 'hbo,netflix,hbo,bogus',
    types: ['series', 'movie'],
    genre: 'Science Fiction',
    yearFrom: 2024,
    yearTo: 2015,
    minRating: 8.04,
    sort: 'IMDB_SCORE',
    region: 'gb',
  });

  assert.deepEqual(config.services, ['netflix', 'hbo']);
  assert.deepEqual(config.types, ['movie', 'series']);
  assert.equal(config.genre, 'scf');
  assert.equal(config.yearFrom, 2015);
  assert.equal(config.yearTo, 2024);
  assert.equal(config.minRating, 8);
  assert.equal(config.sort, 'rating');
  assert.equal(config.region, 'GB');
  assert.equal(filtersActive(config), true);
});

test('encodes and decodes config tokens', () => {
  const token = encodeConfig({
    services: ['disney'],
    types: ['movie'],
    genre: 'ani',
    yearFrom: 2000,
    yearTo: 2024,
    minRating: 7.5,
    sort: 'newest',
    region: 'AU',
  });

  assert.match(token, /^[A-Za-z0-9_-]+$/);
  const decoded = decodeConfig(token);
  assert.deepEqual(decoded.services, ['disney']);
  assert.equal(decoded.genre, 'ani');
  assert.equal(decoded.minRating, 7.5);
  assert.equal(decoded.region, 'AU');
});

test('rejects malformed and nonsensical tokens', () => {
  for (const token of ['', 'a', 'not base64!', '%%%', 'x'.repeat(3100)]) {
    assert.throws(() => decodeConfig(token), ConfigTokenError);
  }
  assert.throws(() => decodeConfig(Buffer.from('[]').toString('base64url')), ConfigTokenError);
});

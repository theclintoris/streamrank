import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConfiguredManifest,
  buildDefaultManifest,
  catalogId,
  configuredAddonId,
  parseCatalogId,
} from '../src/manifest.js';
import { ADDON_ID } from '../src/constants.js';

test('default manifest exposes 14 filterable service rows', () => {
  const manifest = buildDefaultManifest({ baseUrl: 'http://127.0.0.1:7100/' });

  assert.equal(manifest.id, ADDON_ID);
  assert.equal(manifest.catalogs.length, 14);
  assert.equal(manifest.logo, 'http://127.0.0.1:7100/logo.png');
  assert.deepEqual(manifest.types, ['movie', 'series']);
  assert.deepEqual(manifest.resources, ['catalog']);

  for (const catalog of manifest.catalogs) {
    assert.deepEqual(
      catalog.extra.map((extra) => extra.name),
      ['genre', 'year', 'rating', 'sort', 'skip'],
    );
    assert.equal(catalog.extra[0].options.includes('Sci-Fi'), true);
  }
});

test('configured manifest bakes filters into names and exposes only skip', () => {
  const manifest = buildConfiguredManifest({
    baseUrl: 'http://example.test',
    config: {
      services: ['hbo', 'netflix'],
      types: ['series'],
      genre: 'drm',
      yearFrom: 2015,
      yearTo: 2024,
      minRating: 8,
      sort: 'rating',
      region: 'GB',
    },
  });

  assert.equal(manifest.catalogs.length, 2);
  assert.notEqual(manifest.id, ADDON_ID);
  assert.match(manifest.id, /^community\.streamrank\.[a-f0-9]{8}$/);
  assert.deepEqual(manifest.catalogs[0].extra, [{ name: 'skip', isRequired: false }]);
  assert.equal(manifest.catalogs[0].name, 'Netflix · Shows · Drama · 2015–2024 · 8.0+ · IMDb Rating');
});

test('catalog ids round-trip and reject unknown catalogues', () => {
  assert.equal(catalogId('prime', 'movie'), 'prime-movie');
  assert.equal(parseCatalogId('prime-movie').service.key, 'prime');
  assert.equal(parseCatalogId('prime-movie').type, 'movie');
  assert.equal(parseCatalogId('nope-movie'), null);
  assert.equal(parseCatalogId('netflix-book'), null);
});

test('custom addon ids are stable and config-specific', () => {
  const a = configuredAddonId({ services: ['netflix'], types: ['movie'] });
  const b = configuredAddonId({ services: ['netflix'], types: ['movie'] });
  const c = configuredAddonId({ services: ['hulu'], types: ['movie'] });
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.equal(configuredAddonId({}), ADDON_ID);
});

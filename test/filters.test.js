import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchGenre,
  matchRating,
  matchSort,
  matchYear,
  parseCatalogExtra,
  parseFilters,
  parseSkip,
  resolveFilters,
} from '../src/filters.js';
import { encodeConfig } from '../src/config-token.js';

test('parses Stremio query, path-segment and JSON extras', () => {
  assert.deepEqual(parseCatalogExtra({ query: { genre: 'Action', skip: '50' } }), {
    genre: 'Action',
    skip: '50',
  });

  const path = parseCatalogExtra({
    segment: 'genre=Sci-Fi&year=2020s&rating=8.0%2B&skip=100',
  });
  assert.deepEqual(path, {
    genre: 'Sci-Fi',
    year: '2020s',
    rating: '8.0+',
    skip: '100',
  });

  const json = parseCatalogExtra({
    segment: encodeURIComponent(JSON.stringify({ genre: 'Drama', skip: 150 })),
  });
  assert.deepEqual(json, { genre: 'Drama', skip: 150 });
});

test('maps genre codes and display names', () => {
  assert.equal(matchGenre('act'), 'act');
  assert.equal(matchGenre('Action'), 'act');
  assert.equal(matchGenre('sci-fi'), 'scf');
  assert.equal(matchGenre('Documentary'), 'doc');
  assert.equal(matchGenre('Nope'), null);
});

test('maps decade labels, ranges and exact years', () => {
  assert.deepEqual(matchYear('2020s'), { yearFrom: 2020, yearTo: 2029 });
  assert.deepEqual(matchYear('Before 1960'), { yearFrom: 1900, yearTo: 1959 });
  assert.deepEqual(matchYear('1995–1999'), { yearFrom: 1995, yearTo: 1999 });
  assert.deepEqual(matchYear('1995-1999'), { yearFrom: 1995, yearTo: 1999 });
  assert.deepEqual(matchYear('1999'), { yearFrom: 1999, yearTo: 1999 });
  assert.deepEqual(matchYear('nonsense'), { yearFrom: null, yearTo: null });
});

test('maps rating and sort values', () => {
  assert.equal(matchRating('8.0+'), 8);
  assert.equal(matchRating('8.5+'), 8.5);
  assert.equal(matchRating('min 7.5'), 7.5);
  assert.equal(matchRating('11'), null);
  assert.equal(matchRating(''), null);

  assert.equal(matchSort('IMDb Rating'), 'rating');
  assert.equal(matchSort('IMDB_SCORE'), 'rating');
  assert.equal(matchSort('gone'), 'popular');
});

test('caps pagination to the JustWatch window', () => {
  assert.equal(parseSkip('0'), 0);
  assert.equal(parseSkip('-10'), 0);
  assert.equal(parseSkip('50'), 50);
  assert.equal(parseSkip('9999'), 1900);
});

test('baked config beats conflicting dropdown values but keeps skip', () => {
  const token = encodeConfig({
    services: ['netflix'],
    types: ['movie'],
    genre: 'trl',
    yearFrom: 2010,
    yearTo: 2019,
    minRating: 8,
    sort: 'rating',
    region: 'GB',
  });
  const config = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
  const filters = resolveFilters({
    config,
    raw: { genre: 'Comedy', year: '2020s', rating: '6.0+', sort: 'newest', skip: '100' },
  });

  assert.deepEqual(filters, {
    genre: 'trl',
    yearFrom: 2010,
    yearTo: 2019,
    minRating: 8,
    sort: 'rating',
    skip: 100,
  });
  assert.deepEqual(parseFilters({ genre: 'Comedy', year: '2020s' }), {
    genre: 'cmy',
    yearFrom: 2020,
    yearTo: 2029,
    minRating: null,
    sort: 'popular',
    skip: 0,
  });
});

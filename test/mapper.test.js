import test from 'node:test';
import assert from 'node:assert/strict';
import { absoluteImageUrl, mapJustWatchNode, uniqueGenres } from '../src/mapper.js';

function node(overrides = {}) {
  return {
    id: 'tm123',
    content: {
      title: 'Example',
      originalReleaseYear: 2024,
      shortDescription: 'A test title.',
      runtime: 101,
      genres: [
        { shortName: 'scf', technicalName: 'Scifi' },
        { shortName: 'drm', technicalName: 'Drama' },
      ],
      externalIds: { imdbId: 'tt1234567', tmdbId: 42 },
      scoring: { imdbScore: 8.4 },
      posterUrl: '/poster/1/s332/example.webp',
      backdrops: [{ backdropUrl: '/backdrop/1/s1920/example.webp' }],
      ...overrides,
    },
  };
}

test('maps a JustWatch node to a Stremio meta preview', () => {
  const meta = mapJustWatchNode(node(), { type: 'movie' });
  assert.deepEqual(meta, {
    id: 'tt1234567',
    type: 'movie',
    name: 'Example',
    posterShape: 'poster',
    poster: 'https://images.justwatch.com/poster/1/s332/example.webp',
    background: 'https://images.justwatch.com/backdrop/1/s1920/example.webp',
    description: 'A test title.',
    releaseInfo: '2024',
    imdbRating: '8.4',
    genres: ['Sci-Fi', 'Drama'],
    runtime: '101 min',
  });
});

test('falls back to a JustWatch id and omits missing artwork', () => {
  const meta = mapJustWatchNode(
    node({
      externalIds: {},
      posterUrl: null,
      backdrops: [],
      runtime: null,
      scoring: {},
      shortDescription: null,
    }),
    { type: 'series' },
  );
  assert.equal(meta.id, 'jw:tm123');
  assert.equal(meta.runtime, undefined);
  assert.equal(meta.poster, undefined);
  assert.equal(meta.imdbRating, undefined);
  assert.equal(meta.description, undefined);
});

test('drops malformed nodes and normalizes image URLs', () => {
  assert.equal(mapJustWatchNode(null, { type: 'movie' }), null);
  assert.equal(mapJustWatchNode({ content: {} }, { type: 'movie' }), null);
  assert.equal(absoluteImageUrl('//images.example/a.jpg'), 'https://images.example/a.jpg');
  assert.equal(absoluteImageUrl('https://images.example/a.jpg'), 'https://images.example/a.jpg');
  assert.equal(absoluteImageUrl('nonsense'), '');
  assert.deepEqual(
    uniqueGenres([
      { shortName: 'drm' },
      { shortName: 'drm' },
      { shortName: 'zzz', technicalName: 'Made Up' },
    ]),
    ['Drama', 'Made Up'],
  );
});

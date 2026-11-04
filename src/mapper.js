import { GENRE_BY_CODE, IMAGE_BASE } from './constants.js';

/**
 * Convert a JustWatch `popularTitles` node into a Stremio meta preview.
 * Returns null for malformed nodes instead of letting one bad row break a row.
 */
export function mapJustWatchNode(node, { type } = {}) {
  if (!node || !type || !node.content) return null;

  const content = node.content;
  const title = String(content.title ?? '').trim();
  if (!title) return null;

  const imdbId = String(content.externalIds?.imdbId ?? '').trim();
  const id = imdbId || (node.id ? `jw:${node.id}` : '');
  if (!id) return null;

  const year = Number(content.originalReleaseYear);
  const rating = Number(content.scoring?.imdbScore);
  const runtime = Number(content.runtime);
  const poster = absoluteImageUrl(content.posterUrl);
  const background = absoluteImageUrl(content.backdrops?.[0]?.backdropUrl);
  const genres = uniqueGenres(content.genres);

  const meta = {
    id,
    type,
    name: title,
    posterShape: 'poster',
  };

  if (poster) meta.poster = poster;
  if (background) meta.background = background;

  const description = String(content.shortDescription ?? '').trim();
  if (description) meta.description = description;

  if (Number.isInteger(year) && year > 1800) meta.releaseInfo = String(year);
  if (Number.isFinite(rating) && rating > 0 && rating <= 10) {
    meta.imdbRating = String(rating);
  }
  if (genres.length) meta.genres = genres;
  if (type === 'movie' && Number.isFinite(runtime) && runtime > 0) {
    meta.runtime = `${Math.round(runtime)} min`;
  }

  return meta;
}

export function absoluteImageUrl(value) {
  const url = String(value ?? '').trim();
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${IMAGE_BASE}${url}`;
  return '';
}

export function uniqueGenres(genres) {
  const names = [];
  const seen = new Set();

  for (const genre of genres ?? []) {
    if (!genre) continue;
    const code = String(genre.shortName ?? '').trim().toLowerCase();
    const name =
      GENRE_BY_CODE.get(code) ||
      titleCase(String(genre.technicalName ?? '').trim()) ||
      titleCase(code);

    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    names.push(name);
  }

  return names;
}

function titleCase(value) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

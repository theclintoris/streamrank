import {
  GENRE_BY_CODE,
  GENRE_BY_NAME,
  MAX_SKIP,
  RATING_OPTIONS,
  SORT_BY_ENUM,
  SORT_BY_KEY,
  SORT_BY_LABEL,
  YEAR_OPTIONS,
} from './constants.js';
import { normalizeConfig } from './config-token.js';

/**
 * Stremio sends catalog filters either as query parameters
 * (`?genre=Action&skip=100`) or as an encoded path segment
 * (`/genre=Action&skip=100.json`). Accept both, plus a JSON `extra` value.
 */
export function parseCatalogExtra({ query = {}, segment = '' } = {}) {
  const raw = {};

  for (const [key, value] of Object.entries(query ?? {})) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined && first !== null) raw[key] = String(first);
  }

  if (segment) {
    const text = String(segment).trim();
    const decodedText = safeDecode(text);
    if (decodedText.startsWith('{')) {
      try {
        const parsed = JSON.parse(decodedText);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          Object.assign(raw, parsed);
        }
      } catch {
        // Ignore malformed JSON; the query string may still be usable.
      }
    } else {
      for (const part of text.split('&')) {
        if (!part) continue;
        const equals = part.indexOf('=');
        const key = equals === -1 ? part : part.slice(0, equals);
        const value = equals === -1 ? '' : part.slice(equals + 1);
        const decodedKey = safeDecode(key);
        if (decodedKey) raw[decodedKey] = safeDecode(value);
      }
    }
  }

  if (typeof raw.extra === 'string' && raw.extra.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw.extra);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.assign(raw, parsed);
      }
    } catch {
      // Ignore; no filters is a valid fallback.
    }
  }

  return raw;
}

export function parseFilters(raw = {}) {
  const genre = matchGenre(raw.genre);
  const { yearFrom, yearTo } = matchYear(raw.year);
  const minRating = matchRating(raw.rating);
  const sort = matchSort(raw.sort);
  const skip = parseSkip(raw.skip);

  return { genre, yearFrom, yearTo, minRating, sort, skip };
}

export function filtersFromConfig(config) {
  const normalized = normalizeConfig(config);
  return {
    genre: normalized.genre,
    yearFrom: normalized.yearFrom,
    yearTo: normalized.yearTo,
    minRating: normalized.minRating,
    sort: normalized.sort,
    skip: 0,
  };
}

export function resolveFilters({ config = null, raw = {} } = {}) {
  const extra = parseFilters(raw);
  if (!config) return extra;

  return {
    ...filtersFromConfig(config),
    skip: extra.skip,
  };
}

export function matchGenre(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (GENRE_BY_CODE.has(lower)) return lower;
  return GENRE_BY_NAME.get(lower)?.code ?? null;
}

export function matchYear(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return { yearFrom: null, yearTo: null };

  const option = YEAR_OPTIONS.find(
    (entry) => entry.label.toLowerCase() === raw.toLowerCase(),
  );
  if (option) return { yearFrom: option.from, yearTo: option.to };

  const range = /^(\d{4})\s*[–-]\s*(\d{4})$/.exec(raw);
  if (range) {
    const from = Number(range[1]);
    const to = Number(range[2]);
    return { yearFrom: Math.min(from, to), yearTo: Math.max(from, to) };
  }

  const exact = /^(\d{4})$/.exec(raw);
  if (exact) {
    const year = Number(exact[1]);
    if (year >= 1900 && year <= new Date().getUTCFullYear() + 2) {
      return { yearFrom: year, yearTo: year };
    }
  }

  return { yearFrom: null, yearTo: null };
}

export function matchRating(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return null;

  const option = RATING_OPTIONS.find((entry) => entry.label.toLowerCase() === raw);
  if (option) return option.min;

  const match = /^(?:min(?:imum)?\s*)?(\d+(?:\.\d+)?)\s*\+?$/.exec(raw);
  if (!match) return null;

  const rating = Number(match[1]);
  if (!Number.isFinite(rating) || rating <= 0 || rating > 10) return null;
  return rating;
}

export function matchSort(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return 'popular';
  if (SORT_BY_KEY.has(raw)) return raw;
  if (SORT_BY_LABEL.has(raw)) return SORT_BY_LABEL.get(raw).key;
  if (SORT_BY_ENUM.has(raw.toUpperCase())) return SORT_BY_ENUM.get(raw.toUpperCase()).key;
  return 'popular';
}

export function parseSkip(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(parsed, MAX_SKIP);
}

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value ?? ''));
  } catch {
    return String(value ?? '');
  }
}

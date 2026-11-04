import { TtlCache } from './cache.js';
import {
  MEDIA_TYPES,
  PAGE_SIZE,
  SORT_BY_KEY,
  MAX_SKIP,
} from './constants.js';
import { mapJustWatchNode } from './mapper.js';

export const JUSTWATCH_ENDPOINT = 'https://apis.justwatch.com/graphql';

const CONTENT_FIELDS = `
  title
  originalReleaseYear
  shortDescription
  runtime
  genres { shortName technicalName }
  externalIds { imdbId tmdbId }
  scoring { imdbScore imdbVotes tmdbScore tomatoMeter certifiedFresh }
  posterUrl(profile: S332, format: WEBP)
  backdrops(profile: S1920, format: WEBP) { backdropUrl }
`;

export class JustWatchError extends Error {
  constructor(message, { status = 502, code = 'JUSTWATCH_ERROR', details = null } = {}) {
    super(message);
    this.name = 'JustWatchError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class JustWatchClient {
  #endpoint;
  #fetch;
  #timeoutMs;
  #cache;
  #logger;
  #retries;
  #maxConcurrent;
  #active = 0;
  #waiters = [];
  #inflight = new Map();

  constructor({
    endpoint = JUSTWATCH_ENDPOINT,
    fetchImpl = globalThis.fetch,
    timeoutMs = 12_000,
    cache = new TtlCache(),
    logger = console,
    retries = 2,
    maxConcurrent = 4,
  } = {}) {
    if (typeof fetchImpl !== 'function') {
      throw new Error('JustWatchClient requires a fetch implementation.');
    }

    this.#endpoint = endpoint;
    this.#fetch = fetchImpl;
    this.#timeoutMs = timeoutMs;
    this.#cache = cache;
    this.#logger = logger;
    this.#retries = Math.max(0, Number(retries) || 0);
    this.#maxConcurrent = Math.max(1, Number(maxConcurrent) || 1);
  }

  get cache() {
    return this.#cache;
  }

  /**
   * Fetch one page of a service's popular titles, already converted to Stremio
   * meta previews. Identical requests share a cache entry and an in-flight
   * promise, which matters when Stremio opens every catalog row at once.
   */
  async popular({
    service,
    type,
    genre = null,
    yearFrom = null,
    yearTo = null,
    minRating = null,
    sort = 'popular',
    region = 'US',
    offset = 0,
    first = PAGE_SIZE,
  }) {
    if (!service?.shortName) throw new Error('popular() requires a service.');
    if (!MEDIA_TYPES[type]) throw new Error(`Unknown media type: ${type}`);

    const sortEntry = SORT_BY_KEY.get(sort) ?? SORT_BY_KEY.get('popular');
    const safeOffset = clampOffset(offset);
    const safeFirst = Math.min(100, Math.max(1, Number.parseInt(first, 10) || PAGE_SIZE));
    const options = {
      service: service.key,
      package: service.shortName,
      objectType: MEDIA_TYPES[type].objectType,
      genre: genre || null,
      yearFrom: Number.isInteger(yearFrom) ? yearFrom : null,
      yearTo: Number.isInteger(yearTo) ? yearTo : null,
      minRating: Number.isFinite(minRating) ? minRating : null,
      sort: sortEntry.enum,
      region: String(region || 'US').toUpperCase(),
      offset: safeOffset,
      first: safeFirst,
      type,
    };

    if (safeOffset >= MAX_SKIP) return [];

    const cacheKey = JSON.stringify(options);
    const cached = this.#cache.get(cacheKey);
    if (cached !== undefined) return cached;

    const existing = this.#inflight.get(cacheKey);
    if (existing) return existing;

    const promise = this.#fetchPage(options, sortEntry, cacheKey);
    this.#inflight.set(cacheKey, promise);

    try {
      return await promise;
    } finally {
      this.#inflight.delete(cacheKey);
    }
  }

  async #fetchPage(options, sortEntry, cacheKey) {
    const filter = {
      packages: [options.package],
      objectTypes: [options.objectType],
    };

    if (options.genre) filter.genres = [options.genre];
    if (options.yearFrom !== null || options.yearTo !== null) {
      filter.releaseYear = {};
      if (options.yearFrom !== null) filter.releaseYear.min = options.yearFrom;
      if (options.yearTo !== null) filter.releaseYear.max = options.yearTo;
    }
    if (options.minRating !== null) filter.imdbScore = { min: options.minRating };

    const query = buildQuery(sortEntry.enum);
    const variables = {
      country: options.region,
      language: 'en',
      first: options.first,
      offset: options.offset,
      filter,
    };

    try {
      const payload = await this.#request(query, variables);
      const edges = payload?.data?.popularTitles?.edges;
      if (!Array.isArray(edges)) {
        throw new JustWatchError('Unexpected JustWatch response shape.', {
          code: 'BAD_RESPONSE',
          details: payload?.errors ?? null,
        });
      }

      const metas = [];
      for (const edge of edges) {
        const meta = mapJustWatchNode(edge?.node, { type: options.type });
        if (meta) metas.push(meta);
      }

      this.#cache.set(cacheKey, metas);
      return metas;
    } catch (error) {
      const stale = this.#cache.peekStale(cacheKey);
      if (Array.isArray(stale)) {
        this.#logger.warn?.(
          `[streamrank] JustWatch failed (${error.message}); serving stale ${options.service}/${options.type}.`,
        );
        return stale;
      }
      throw error;
    }
  }

  async #request(query, variables) {
    let lastError;

    for (let attempt = 0; attempt <= this.#retries; attempt += 1) {
      try {
        return await this.#withSlot(() => this.#post(query, variables));
      } catch (error) {
        lastError = error;
        if (!error.retryable || attempt === this.#retries) break;
        await sleep(250 * 2 ** attempt);
      }
    }

    throw lastError;
  }

  async #post(query, variables) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);

    try {
      const response = await this.#fetch(this.#endpoint, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          origin: 'https://www.justwatch.com',
          referer: 'https://www.justwatch.com/',
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });

      const text = await response.text();
      let payload = null;

      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        throw new JustWatchError(`JustWatch returned non-JSON (HTTP ${response.status}).`, {
          status: 502,
          code: 'BAD_JSON',
          details: text.slice(0, 500),
        });
      }

      if (!response.ok) {
        const message =
          payload?.errors?.[0]?.message ||
          payload?.message ||
          `JustWatch request failed (HTTP ${response.status}).`;
        throw new JustWatchError(message, {
          status: response.status === 429 ? 503 : 502,
          code: response.status === 429 ? 'RATE_LIMITED' : 'HTTP_ERROR',
          details: payload?.errors ?? null,
        });
      }

      if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
        throw new JustWatchError(payload.errors[0]?.message || 'JustWatch GraphQL error.', {
          status: 502,
          code: 'GRAPHQL_ERROR',
          details: payload.errors,
        });
      }

      return payload;
    } catch (error) {
      if (error instanceof JustWatchError) {
        error.retryable = error.status === 503 || error.status >= 500;
        throw error;
      }

      const aborted = error?.name === 'AbortError';
      const wrapped = new JustWatchError(
        aborted ? 'JustWatch request timed out.' : `JustWatch request failed: ${error.message}`,
        { status: 504, code: aborted ? 'TIMEOUT' : 'NETWORK_ERROR' },
      );
      wrapped.retryable = true;
      throw wrapped;
    } finally {
      clearTimeout(timer);
    }
  }

  async #withSlot(fn) {
    if (this.#active >= this.#maxConcurrent) {
      await new Promise((resolve) => this.#waiters.push(resolve));
    }

    this.#active += 1;
    try {
      return await fn();
    } finally {
      this.#active -= 1;
      const next = this.#waiters.shift();
      if (next) next();
    }
  }
}

export function buildQuery(sortEnum = 'POPULAR') {
  const safeSort = SORT_BY_KEY.has(String(sortEnum).toLowerCase())
    ? SORT_BY_KEY.get(String(sortEnum).toLowerCase()).enum
    : String(sortEnum);
  const allowedSort = new Set(['POPULAR', 'TRENDING', 'IMDB_SCORE', 'RELEASE_YEAR']);
  const sort = allowedSort.has(safeSort) ? safeSort : 'POPULAR';

  return `
    query PopularTitles(
      $country: Country!
      $language: Language!
      $first: Int!
      $offset: Int
      $filter: TitleFilter
    ) {
      popularTitles(
        country: $country
        filter: $filter
        first: $first
        offset: $offset
        sortBy: ${sort}
        sortRandomSeed: 0
      ) {
        edges {
          node {
            id
            objectType
            content(country: $country, language: $language) {
              ${CONTENT_FIELDS}
            }
          }
        }
      }
    }
  `;
}

function clampOffset(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, MAX_SKIP);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

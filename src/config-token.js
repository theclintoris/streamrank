import {
  COUNTRY_CODES,
  DEFAULT_REGION,
  DEFAULT_SORT,
  GENRE_BY_CODE,
  GENRE_BY_NAME,
  SERVICE_KEYS,
  SORT_BY_ENUM,
  SORT_BY_KEY,
  SORT_BY_LABEL,
  TYPE_KEYS,
} from './constants.js';

const MIN_YEAR = 1900;
const MAX_TOKEN_LENGTH = 3000;

export function normalizeConfig(input = {}) {
  const source = isPlainObject(input) ? input : {};
  const services = normalizeList(source.services, SERVICE_KEYS);
  const types = normalizeList(source.types, TYPE_KEYS);
  const genre = normalizeGenre(source.genre);
  const { yearFrom, yearTo } = normalizeYears(source.yearFrom, source.yearTo);
  const minRating = normalizeRating(source.minRating);
  const sort = normalizeSort(source.sort);
  const region = normalizeRegion(source.region);

  return {
    services: services.length ? services : [...SERVICE_KEYS],
    types: types.length ? types : [...TYPE_KEYS],
    genre,
    yearFrom,
    yearTo,
    minRating,
    sort,
    region,
  };
}

export function defaultConfig() {
  return normalizeConfig({});
}

export function isDefaultConfig(config) {
  const normalized = normalizeConfig(config);
  return (
    normalized.services.length === SERVICE_KEYS.length &&
    normalized.services.every((service, index) => service === SERVICE_KEYS[index]) &&
    normalized.types.length === TYPE_KEYS.length &&
    normalized.types.every((type, index) => type === TYPE_KEYS[index]) &&
    normalized.genre === null &&
    normalized.yearFrom === null &&
    normalized.yearTo === null &&
    normalized.minRating === null &&
    normalized.sort === DEFAULT_SORT &&
    normalized.region === DEFAULT_REGION
  );
}

export function encodeConfig(config) {
  const normalized = normalizeConfig(config);
  return Buffer.from(JSON.stringify(normalized), 'utf8').toString('base64url');
}

export function decodeConfig(token) {
  const raw = String(token ?? '').trim();
  if (raw.length < 2 || raw.length > MAX_TOKEN_LENGTH || !/^[A-Za-z0-9_-]+$/.test(raw)) {
    throw new ConfigTokenError('Invalid configuration token.');
  }

  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw new ConfigTokenError('Invalid configuration token.');
  }

  if (!isPlainObject(parsed)) {
    throw new ConfigTokenError('Invalid configuration token.');
  }

  return normalizeConfig(parsed);
}

export function filtersActive(config) {
  const normalized = normalizeConfig(config);
  return Boolean(
    normalized.genre ||
      normalized.yearFrom !== null ||
      normalized.yearTo !== null ||
      normalized.minRating !== null ||
      normalized.sort !== DEFAULT_SORT,
  );
}

export class ConfigTokenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigTokenError';
    this.status = 400;
  }
}

function normalizeList(value, allowed) {
  const list = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];
  const seen = new Set();

  for (const item of list) {
    const key = String(item ?? '').trim().toLowerCase();
    if (allowed.includes(key) && !seen.has(key)) seen.add(key);
  }

  // Preserve the canonical order rather than the order posted by the browser.
  return allowed.filter((key) => seen.has(key));
}

function normalizeGenre(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return null;
  if (GENRE_BY_CODE.has(raw)) return raw;
  return GENRE_BY_NAME.get(raw)?.code ?? null;
}

function normalizeYears(fromValue, toValue) {
  let yearFrom = parseYear(fromValue);
  let yearTo = parseYear(toValue);

  if (yearFrom !== null && yearTo !== null && yearFrom > yearTo) {
    [yearFrom, yearTo] = [yearTo, yearFrom];
  }

  return { yearFrom, yearTo };
}

function parseYear(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number)) return null;
  const maxYear = new Date().getUTCFullYear() + 2;
  if (number < MIN_YEAR || number > maxYear) return null;
  return number;
}

function normalizeRating(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  if (number <= 0 || number > 10) return null;
  return Math.round(number * 10) / 10;
}

function normalizeSort(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return DEFAULT_SORT;
  if (SORT_BY_KEY.has(raw)) return raw;
  if (SORT_BY_LABEL.has(raw)) return SORT_BY_LABEL.get(raw).key;
  if (SORT_BY_ENUM.has(raw.toUpperCase())) return SORT_BY_ENUM.get(raw.toUpperCase()).key;
  return DEFAULT_SORT;
}

function normalizeRegion(value) {
  const raw = String(value ?? '').trim().toUpperCase();
  return COUNTRY_CODES.has(raw) ? raw : DEFAULT_REGION;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

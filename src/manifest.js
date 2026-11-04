import { createHash } from 'node:crypto';
import {
  ADDON_ID,
  ADDON_NAME,
  ADDON_VERSION,
  GENRE_BY_CODE,
  GENRES,
  MEDIA_TYPES,
  RATING_OPTIONS,
  SERVICE_BY_KEY,
  SERVICES,
  SORT_BY_KEY,
  SORTS,
  YEAR_OPTIONS,
} from './constants.js';
import { filtersActive, isDefaultConfig, normalizeConfig } from './config-token.js';

const EXTRA_FILTERS = Object.freeze([
  {
    name: 'genre',
    isRequired: false,
    options: GENRES.map((genre) => genre.name),
  },
  {
    name: 'year',
    isRequired: false,
    options: YEAR_OPTIONS.map((option) => option.label),
  },
  {
    name: 'rating',
    isRequired: false,
    options: RATING_OPTIONS.map((option) => option.label),
  },
  {
    name: 'sort',
    isRequired: false,
    options: SORTS.map((sort) => sort.label),
  },
  { name: 'skip', isRequired: false },
]);

export function buildDefaultManifest({ baseUrl = '' } = {}) {
  const catalogs = [];

  for (const service of SERVICES) {
    for (const type of Object.keys(MEDIA_TYPES)) {
      catalogs.push({
        type,
        id: catalogId(service.key, type),
        name: `${service.name} · ${MEDIA_TYPES[type].label}`,
        extra: EXTRA_FILTERS.map((extra) => ({ ...extra })),
      });
    }
  }

  return baseManifest({ baseUrl, id: ADDON_ID, catalogs, configurable: true });
}

export function buildConfiguredManifest({ baseUrl = '', config } = {}) {
  const normalized = normalizeConfig(config);
  const catalogs = [];

  for (const serviceKey of normalized.services) {
    const service = SERVICE_BY_KEY.get(serviceKey);
    if (!service) continue;

    for (const type of normalized.types) {
      catalogs.push({
        type,
        id: catalogId(service.key, type),
        name: configuredCatalogName(service, type, normalized),
        extra: [{ name: 'skip', isRequired: false }],
      });
    }
  }

  return baseManifest({
    baseUrl,
    id: configuredAddonId(normalized),
    catalogs,
  });
}

export function buildManifestForConfig({ baseUrl = '', config = null } = {}) {
  return config ? buildConfiguredManifest({ baseUrl, config }) : buildDefaultManifest({ baseUrl });
}

export function baseManifest({
  baseUrl = '',
  id = ADDON_ID,
  catalogs = [],
  configurable = false,
} = {}) {
  const base = String(baseUrl ?? '').replace(/\/+$/, '');

  return {
    id,
    version: ADDON_VERSION,
    name: ADDON_NAME,
    description:
      'Top movies and shows on Netflix, Hulu, Disney+, Apple TV+, Paramount+, HBO Max and Prime Video — with genre, year, IMDb rating and sort filters. Metadata links to IMDb IDs, so existing stream add-ons keep working.',
    ...(base ? { logo: `${base}/logo.png` } : {}),
    resources: ['catalog'],
    types: Object.keys(MEDIA_TYPES),
    catalogs,
    behaviorHints: {
      adult: false,
      ...(configurable ? { configurable: true } : {}),
    },
  };
}

export function catalogId(serviceKey, type) {
  return `${serviceKey}-${type}`;
}

export function parseCatalogId(id) {
  const match = /^([a-z]+)-(movie|series)$/.exec(String(id ?? ''));
  if (!match) return null;

  const service = SERVICE_BY_KEY.get(match[1]);
  if (!service) return null;

  return { service, type: match[2] };
}

export function configuredAddonId(config) {
  if (isDefaultConfig(config)) return ADDON_ID;
  const hash = createHash('sha1').update(JSON.stringify(normalizeConfig(config))).digest('hex');
  return `${ADDON_ID}.${hash.slice(0, 8)}`;
}

export function configuredCatalogName(service, type, config) {
  const base = `${service.name} · ${MEDIA_TYPES[type].label}`;
  if (!filtersActive(config)) return base;

  const bits = [];
  if (config.genre) bits.push(GENRE_BY_CODE.get(config.genre) || config.genre);

  const year = formatYearRange(config.yearFrom, config.yearTo);
  if (year) bits.push(year);

  if (Number.isFinite(config.minRating)) {
    bits.push(`${config.minRating.toFixed(1)}+`);
  }

  if (config.sort && config.sort !== 'popular') {
    bits.push(SORT_BY_KEY.get(config.sort)?.label || 'Popular');
  }

  return bits.length ? `${base} · ${bits.join(' · ')}` : base;
}

export function formatYearRange(from, to) {
  if (Number.isInteger(from) && Number.isInteger(to)) return `${from}–${to}`;
  if (Number.isInteger(from)) return `${from}+`;
  if (Number.isInteger(to)) return `Up to ${to}`;
  return '';
}

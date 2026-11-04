export const ADDON_ID = 'community.streamrank';
export const ADDON_VERSION = '1.0.0';
export const ADDON_NAME = 'StreamRank';

export const SERVICES = Object.freeze([
  {
    key: 'netflix',
    name: 'Netflix',
    shortName: 'nfx',
    accent: '#e50914',
    note: 'Netflix',
  },
  {
    key: 'hulu',
    name: 'Hulu',
    shortName: 'hlu',
    accent: '#1ce783',
    note: 'Hulu',
  },
  {
    key: 'disney',
    name: 'Disney+',
    shortName: 'dnp',
    accent: '#4f8cff',
    note: 'Disney Plus',
  },
  {
    key: 'apple',
    name: 'Apple TV+',
    shortName: 'atp',
    accent: '#f5f5f7',
    note: 'Apple TV Plus',
  },
  {
    key: 'paramount',
    name: 'Paramount+',
    shortName: 'ppp',
    accent: '#1f6fff',
    note: 'Paramount Plus Premium',
  },
  {
    key: 'hbo',
    name: 'HBO Max',
    shortName: 'mxx',
    accent: '#a855f7',
    note: 'Max / HBO Max',
  },
  {
    key: 'prime',
    name: 'Prime Video',
    shortName: 'amp',
    accent: '#00a8e1',
    note: 'Amazon Prime Video',
  },
]);

export const SERVICE_BY_KEY = new Map(SERVICES.map((service) => [service.key, service]));
export const SERVICE_KEYS = SERVICES.map((service) => service.key);

export const MEDIA_TYPES = Object.freeze({
  movie: { label: 'Movies', singular: 'Movie', objectType: 'MOVIE' },
  series: { label: 'Shows', singular: 'Show', objectType: 'SHOW' },
});

export const TYPE_KEYS = Object.keys(MEDIA_TYPES);

// JustWatch's TitleFilter.genres accepts its internal three-letter codes.
// `shortName` from the API is that code; `technicalName` is a readable word.
export const GENRES = Object.freeze([
  { code: 'act', name: 'Action' },
  { code: 'ani', name: 'Animation' },
  { code: 'cmy', name: 'Comedy' },
  { code: 'crm', name: 'Crime' },
  { code: 'doc', name: 'Documentary' },
  { code: 'drm', name: 'Drama' },
  { code: 'eur', name: 'European' },
  { code: 'fml', name: 'Family' },
  { code: 'fnt', name: 'Fantasy' },
  { code: 'hrr', name: 'Horror' },
  { code: 'hst', name: 'History' },
  { code: 'msc', name: 'Music' },
  { code: 'rly', name: 'Reality' },
  { code: 'rma', name: 'Romance' },
  { code: 'scf', name: 'Sci-Fi' },
  { code: 'spt', name: 'Sport' },
  { code: 'trl', name: 'Thriller' },
  { code: 'war', name: 'War' },
  { code: 'wsn', name: 'Western' },
]);

export const GENRE_BY_CODE = new Map(GENRES.map((genre) => [genre.code, genre.name]));
export const GENRE_BY_NAME = new Map(GENRES.map((genre) => [genre.name.toLowerCase(), genre]));

// A few common spellings the JustWatch UI/API use that do not match our labels.
for (const [alias, code] of [
  ['science fiction', 'scf'],
  ['sci fi', 'scf'],
  ['scifi', 'scf'],
  ['documentation', 'doc'],
]) {
  if (!GENRE_BY_NAME.has(alias)) {
    const genre = GENRES.find((entry) => entry.code === code);
    if (genre) GENRE_BY_NAME.set(alias, genre);
  }
}

export const SORTS = Object.freeze([
  { key: 'popular', label: 'Popular', enum: 'POPULAR' },
  { key: 'trending', label: 'Trending', enum: 'TRENDING' },
  { key: 'rating', label: 'IMDb Rating', enum: 'IMDB_SCORE' },
  { key: 'newest', label: 'Newest', enum: 'RELEASE_YEAR' },
]);

export const SORT_BY_KEY = new Map(SORTS.map((sort) => [sort.key, sort]));
export const SORT_BY_LABEL = new Map(SORTS.map((sort) => [sort.label.toLowerCase(), sort]));
export const SORT_BY_ENUM = new Map(SORTS.map((sort) => [sort.enum, sort]));

export const YEAR_OPTIONS = Object.freeze([
  { label: '2020s', from: 2020, to: 2029 },
  { label: '2010s', from: 2010, to: 2019 },
  { label: '2000s', from: 2000, to: 2009 },
  { label: '1990s', from: 1990, to: 1999 },
  { label: '1980s', from: 1980, to: 1989 },
  { label: '1970s', from: 1970, to: 1979 },
  { label: '1960s', from: 1960, to: 1969 },
  { label: 'Before 1960', from: 1900, to: 1959 },
]);

export const RATING_OPTIONS = Object.freeze([
  { label: '9.0+', min: 9 },
  { label: '8.5+', min: 8.5 },
  { label: '8.0+', min: 8 },
  { label: '7.5+', min: 7.5 },
  { label: '7.0+', min: 7 },
  { label: '6.0+', min: 6 },
]);

export const COUNTRIES = Object.freeze([
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'DE', name: 'Germany' },
]);

export const COUNTRY_CODES = new Set(COUNTRIES.map((country) => country.code));

export const DEFAULT_REGION = 'US';
export const DEFAULT_SORT = 'popular';
export const PAGE_SIZE = 50;
export const MAX_SKIP = 1900;
export const IMAGE_BASE = 'https://images.justwatch.com';

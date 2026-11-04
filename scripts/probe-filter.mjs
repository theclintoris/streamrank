import { buildQuery } from '../src/justwatch.js';

const baseFilter = { packages: ['nfx'], objectTypes: ['MOVIE'] };
const variants = {
  base: {},
  genre: { genres: ['act'] },
  yearFrom: { releaseYearFrom: 2020 },
  yearTo: { releaseYearUntil: 2029 },
  rating: { imdbScore: { min: 8 } },
  all: { genres: ['act'], releaseYearFrom: 2020, releaseYearUntil: 2029, imdbScore: { min: 8 } },
};

for (const [name, extra] of Object.entries(variants)) {
  const response = await fetch('https://apis.justwatch.com/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0',
      origin: 'https://www.justwatch.com',
      referer: 'https://www.justwatch.com/',
    },
    body: JSON.stringify({
      query: buildQuery('POPULAR'),
      variables: {
        country: 'US',
        language: 'en',
        first: 5,
        offset: 0,
        filter: { ...baseFilter, ...extra },
      },
    }),
  });
  const payload = await response.json();
  console.log(
    name,
    response.status,
    payload.errors
      ? JSON.stringify(payload.errors)
      : `${payload.data?.popularTitles?.edges?.length ?? 0} edges`,
  );
}

import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import compression from 'compression';
import { TtlCache } from './cache.js';
import { ADDON_VERSION, SERVICES } from './constants.js';
import { loadConfig } from './config.js';
import { ConfigTokenError, decodeConfig } from './config-token.js';
import { parseCatalogExtra, resolveFilters } from './filters.js';
import { JustWatchClient } from './justwatch.js';
import { renderLandingPage } from './landing.js';
import { buildManifestForConfig, parseCatalogId } from './manifest.js';
import { requestBaseUrl } from './url.js';

const config = loadConfig();
const publicDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const cache = new TtlCache({ ttlMs: config.cacheTtlMs, max: 500 });
const justwatch = new JustWatchClient({
  endpoint: config.justwatchEndpoint,
  timeoutMs: config.requestTimeoutMs,
  cache,
  logger: console,
  maxConcurrent: 4,
});

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use(compression());

// Stremio's desktop webview fetches this LAN server from a public HTTPS page.
// Chromium's Private Network Access preflight needs an explicit opt-in.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.get('/healthz', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: true,
    name: 'StreamRank',
    version: ADDON_VERSION,
    services: SERVICES.map((service) => service.key),
    region: config.region,
    cacheEntries: cache.size,
  });
});

app.get('/logo.png', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(publicDirectory, 'logo.png'));
});

app.get('/logo.svg', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(publicDirectory, 'logo.svg'));
});

app.get('/favicon.ico', (req, res) => {
  res.redirect(301, '/logo.png');
});

function sendManifest(req, res, userConfig = null) {
  const baseUrl = requestBaseUrl(req, config.publicUrl);
  const manifest = buildManifestForConfig({ baseUrl, config: userConfig });

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.setHeader('Vary', 'Host, X-Forwarded-Host, X-Forwarded-Proto');
  res.end(JSON.stringify(manifest));
}

app.get(['/manifest.json', '/m.json'], (req, res) => {
  sendManifest(req, res);
});

app.get('/c/:token/manifest.json', (req, res, next) => {
  try {
    sendManifest(req, res, decodeConfig(req.params.token));
  } catch (error) {
    next(error);
  }
});

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.end(
    renderLandingPage({
      baseUrl: requestBaseUrl(req, config.publicUrl),
      version: ADDON_VERSION,
      region: config.region,
    }),
  );
});

app.get('/configure', (req, res) => {
  res.redirect(302, '/');
});

async function sendCatalog(req, res, userConfig = null) {
  const { type, id } = req.params;
  const parsed = parseCatalogId(id);
  if (!parsed || parsed.type !== type) {
    res.json({ metas: [] });
    return;
  }

  const raw = parseCatalogExtra({
    query: req.query,
    segment: req.params.extra ?? '',
  });
  const filters = resolveFilters({ config: userConfig, raw });

  const metas = await justwatch.popular({
    service: parsed.service,
    type: parsed.type,
    genre: filters.genre,
    yearFrom: filters.yearFrom,
    yearTo: filters.yearTo,
    minRating: filters.minRating,
    sort: filters.sort,
    region: userConfig?.region ?? config.region,
    offset: filters.skip,
  });

  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({
    metas,
    cacheMaxAge: 600,
    staleRevalidate: 60 * 60,
    staleError: 24 * 60 * 60,
  });
}

const catalogPaths = [
  '/catalog/:type/:id.json',
  '/catalog/:type/:id/:extra.json',
];

app.get(catalogPaths, async (req, res, next) => {
  try {
    await sendCatalog(req, res);
  } catch (error) {
    next(error);
  }
});

app.get(
  ['/c/:token/catalog/:type/:id.json', '/c/:token/catalog/:type/:id/:extra.json'],
  async (req, res, next) => {
    try {
      await sendCatalog(req, res, decodeConfig(req.params.token));
    } catch (error) {
      next(error);
    }
  },
);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error instanceof ConfigTokenError) {
    res.status(400).json({ error: error.message });
    return;
  }

  console.error(`[streamrank] ${req.method} ${req.originalUrl}:`, error);
  res.status(Number(error?.status) || 502).json({
    error: error?.message || 'Upstream catalog request failed.',
  });
});

const server = app.listen(config.port, '0.0.0.0', () => {
  const { port } = server.address();
  const localUrl = `http://127.0.0.1:${port}`;
  const lanUrls = listLanUrls(port);

  console.log('');
  console.log('  StreamRank · Stremio addon');
  console.log(`  Local:    ${localUrl}`);
  if (lanUrls.length) console.log(`  LAN:      ${lanUrls.join('  ')}`);
  console.log(`  Manifest: ${localUrl}/manifest.json`);
  console.log(`  Builder:  ${localUrl}/`);
  console.log(`  Region:   ${config.region}   Cache: ${Math.round(config.cacheTtlMs / 1000)}s`);
  console.log('');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}

function listLanUrls(port) {
  const urls = [];
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        urls.push(`http://${address.address}:${port}`);
      }
    }
  }
  return urls;
}

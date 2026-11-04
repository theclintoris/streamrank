import {
  ADDON_VERSION,
  COUNTRIES,
  DEFAULT_REGION,
  GENRES,
  RATING_OPTIONS,
  SERVICES,
  SORTS,
  YEAR_OPTIONS,
} from './constants.js';

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

export function renderLandingPage({
  baseUrl = 'http://127.0.0.1:7100',
  version = ADDON_VERSION,
  region = DEFAULT_REGION,
} = {}) {
  const base = String(baseUrl).replace(/\/+$/, '');
  const manifestUrl = `${base}/manifest.json`;
  const installUrl = toStremioUrl(manifestUrl);
  const currentYear = new Date().getUTCFullYear();
  const yearChoices = [];
  for (let year = currentYear + 1; year >= 1900; year -= 1) yearChoices.push(year);

  const data = {
    baseUrl: base,
    defaultRegion: region,
    services: SERVICES.map(({ key, name, accent, note }) => ({ key, name, accent, note })),
    genres: GENRES.map(({ code, name }) => ({ code, name })),
    ratings: RATING_OPTIONS.map(({ label, min }) => ({ label, min })),
    sorts: SORTS.map(({ key, label }) => ({ key, label })),
    countries: COUNTRIES.map(({ code, name }) => ({ code, name })),
  };

  const serviceCards = SERVICES.map(
    (service) => `
      <label class="service" style="--service:${escapeHtml(service.accent)}">
        <input type="checkbox" name="service" value="${escapeHtml(service.key)}" checked>
        <span class="service__check" aria-hidden="true"></span>
        <span class="service__mark" aria-hidden="true"></span>
        <span class="service__name">${escapeHtml(service.name)}</span>
      </label>`,
  ).join('');

  const genreOptions = [
    '<option value="">Any genre</option>',
    ...GENRES.map((genre) => `<option value="${escapeHtml(genre.code)}">${escapeHtml(genre.name)}</option>`),
  ].join('');

  const ratingOptions = [
    '<option value="">Any rating</option>',
    ...RATING_OPTIONS.map(
      (rating) => `<option value="${escapeHtml(rating.min)}">${escapeHtml(rating.label)}</option>`,
    ),
  ].join('');

  const sortOptions = SORTS.map(
    (sort) =>
      `<option value="${escapeHtml(sort.key)}"${sort.key === 'popular' ? ' selected' : ''}>${escapeHtml(sort.label)}</option>`,
  ).join('');

  const countryOptions = COUNTRIES.map(
    (country) =>
      `<option value="${escapeHtml(country.code)}"${country.code === region ? ' selected' : ''}>${escapeHtml(country.name)}</option>`,
  ).join('');

  const yearOptions = [
    '<option value="">Any</option>',
    ...yearChoices.map((year) => `<option value="${year}">${year}</option>`),
  ].join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>StreamRank · Top streaming charts for Stremio</title>
  <meta name="description" content="A Stremio addon for the top movies and shows on Netflix, Hulu, Disney+, Apple TV+, Paramount+, HBO Max and Prime Video. Filter by genre, year and IMDb rating.">
  <link rel="icon" href="/logo.svg" type="image/svg+xml">
  <style>
    :root {
      color-scheme: dark;
      --bg: #07070b;
      --panel: rgba(19, 19, 28, 0.78);
      --panel-strong: #15151f;
      --line: rgba(255, 255, 255, 0.09);
      --line-strong: rgba(255, 255, 255, 0.16);
      --text: #f6f6fb;
      --muted: #9d9daf;
      --muted-2: #75758a;
      --accent: #a78bfa;
      --accent-2: #f5c518;
      --accent-3: #22d3ee;
      --ok: #4ade80;
      --warn: #fbbf24;
      --danger: #fb7185;
      --radius: 20px;
      --shadow: 0 28px 80px rgba(0, 0, 0, 0.42);
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }

    body {
      margin: 0;
      min-height: 100vh;
      color: var(--text);
      background:
        radial-gradient(1000px 600px at 12% -8%, rgba(139, 92, 246, 0.24), transparent 62%),
        radial-gradient(900px 600px at 100% 2%, rgba(34, 211, 238, 0.10), transparent 58%),
        radial-gradient(700px 500px at 50% 100%, rgba(245, 197, 24, 0.05), transparent 60%),
        var(--bg);
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
    }

    a { color: #c4b5fd; }
    a:hover { color: #fff; }
    button, input, select { font: inherit; }
    button { color: inherit; }

    .shell {
      width: min(1120px, calc(100% - 40px));
      margin: 0 auto;
      padding: 28px 0 56px;
    }

    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 10px 0 34px;
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 11px;
      color: var(--text);
      font-weight: 800;
      letter-spacing: -0.02em;
      text-decoration: none;
      font-size: 1.06rem;
    }

    .brand img { width: 34px; height: 34px; border-radius: 10px; }

    .nav__meta {
      display: flex;
      align-items: center;
      gap: 9px;
      color: var(--muted);
      font-size: 0.82rem;
      white-space: nowrap;
    }

    .pulse {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: var(--ok);
      box-shadow: 0 0 0 5px rgba(74, 222, 128, 0.12);
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
      gap: 34px;
      align-items: center;
      padding: 22px 0 52px;
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px;
      padding: 6px 10px;
      color: #d8ccff;
      background: rgba(167, 139, 250, 0.1);
      border: 1px solid rgba(167, 139, 250, 0.22);
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }

    .eyebrow span { color: var(--accent-2); }

    h1 {
      margin: 0;
      max-width: 760px;
      font-size: clamp(2.55rem, 6.4vw, 5.1rem);
      line-height: 0.98;
      letter-spacing: -0.055em;
    }

    h1 em {
      font-style: normal;
      color: transparent;
      background: linear-gradient(115deg, #fff 8%, #c4b5fd 48%, #67e8f9 92%);
      -webkit-background-clip: text;
      background-clip: text;
    }

    .lede {
      max-width: 650px;
      margin: 20px 0 0;
      color: var(--muted);
      font-size: clamp(1rem, 1.7vw, 1.13rem);
    }

    .lede strong { color: var(--text); font-weight: 650; }

    .hero__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 28px;
    }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      min-height: 48px;
      padding: 0 21px;
      border: 1px solid transparent;
      border-radius: 13px;
      background: linear-gradient(135deg, #b49bff, #7c5cf5);
      color: #fff;
      font-weight: 750;
      font-size: 0.95rem;
      text-decoration: none;
      cursor: pointer;
      transition: transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease, background 150ms ease;
      box-shadow: 0 16px 34px rgba(109, 79, 245, 0.32);
    }

    .button:hover { transform: translateY(-1px); color: #fff; box-shadow: 0 20px 42px rgba(109, 79, 245, 0.42); }
    .button:active { transform: translateY(0); }
    .button[aria-disabled="true"] { opacity: 0.45; pointer-events: none; box-shadow: none; }

    .button--ghost {
      background: rgba(255, 255, 255, 0.03);
      border-color: var(--line-strong);
      color: var(--text);
      box-shadow: none;
    }

    .button--ghost:hover { background: rgba(255, 255, 255, 0.07); box-shadow: none; }

    .button--small { min-height: 40px; padding: 0 14px; font-size: 0.85rem; border-radius: 10px; }

    .service-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 30px;
    }

    .service-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 10px;
      color: #d8d8e3;
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid var(--line);
      border-radius: 999px;
      font-size: 0.76rem;
      font-weight: 650;
    }

    .service-pill i {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: var(--service);
      box-shadow: 0 0 12px color-mix(in srgb, var(--service) 55%, transparent);
    }

    .hero__visual {
      position: relative;
      min-height: 390px;
    }

    .board {
      position: relative;
      padding: 18px;
      background: linear-gradient(160deg, rgba(27, 27, 39, 0.92), rgba(13, 13, 20, 0.92));
      border: 1px solid var(--line);
      border-radius: 24px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .board::before {
      content: "";
      position: absolute;
      inset: -1px;
      background: linear-gradient(120deg, rgba(167, 139, 250, 0.20), transparent 42%, rgba(34, 211, 238, 0.12));
      pointer-events: none;
      mask: linear-gradient(#000, transparent 50%);
    }

    .board__head {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 2px 2px 15px;
    }

    .board__title { font-size: 0.85rem; font-weight: 800; letter-spacing: 0.02em; }
    .board__tag {
      padding: 4px 8px;
      color: #0b0b10;
      background: var(--accent-2);
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .row {
      position: relative;
      display: grid;
      grid-template-columns: 24px 38px minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      padding: 9px 8px;
      border-radius: 11px;
      transition: background 150ms ease;
    }

    .row + .row { border-top: 1px solid rgba(255, 255, 255, 0.045); }
    .row:nth-child(3) { background: rgba(167, 139, 250, 0.08); }

    .row__rank {
      color: var(--muted-2);
      font-size: 0.72rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      text-align: center;
    }

    .row__art {
      width: 38px;
      height: 54px;
      border-radius: 7px;
      background:
        linear-gradient(150deg, rgba(255,255,255,0.22), transparent 55%),
        linear-gradient(135deg, var(--art-a), var(--art-b));
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.10);
    }

    .row__copy { min-width: 0; }
    .row__name {
      overflow: hidden;
      color: #f1f1f8;
      font-size: 0.79rem;
      font-weight: 720;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .row__meta {
      overflow: hidden;
      margin-top: 2px;
      color: var(--muted-2);
      font-size: 0.65rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .row__score {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--accent-2);
      font-size: 0.68rem;
      font-weight: 800;
    }

    .board__filters {
      position: relative;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding-top: 14px;
      margin-top: 8px;
      border-top: 1px solid var(--line);
    }

    .mini-chip {
      padding: 4px 8px;
      color: var(--muted);
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--line);
      border-radius: 7px;
      font-size: 0.62rem;
      font-weight: 650;
    }

    .mini-chip--on { color: #ddd2ff; border-color: rgba(167, 139, 250, 0.3); background: rgba(167, 139, 250, 0.10); }

    .float-card {
      position: absolute;
      right: -16px;
      bottom: 30px;
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 10px 12px;
      background: rgba(18, 18, 27, 0.96);
      border: 1px solid var(--line-strong);
      border-radius: 12px;
      box-shadow: 0 18px 40px rgba(0,0,0,0.38);
      font-size: 0.68rem;
      color: var(--muted);
    }

    .float-card strong { display: block; color: var(--text); font-size: 0.72rem; }
    .float-card__icon {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      color: #0b0b10;
      background: var(--ok);
      border-radius: 8px;
      font-weight: 950;
    }

    .section { padding: 38px 0; }
    .section--builder { padding-top: 18px; }

    .section-head {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 22px;
    }

    .kicker {
      margin: 0 0 6px;
      color: var(--accent);
      font-size: 0.72rem;
      font-weight: 850;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    h2 {
      margin: 0;
      font-size: clamp(1.65rem, 3.4vw, 2.35rem);
      letter-spacing: -0.035em;
      line-height: 1.08;
    }

    .section-head p {
      max-width: 470px;
      margin: 0;
      color: var(--muted);
      font-size: 0.92rem;
    }

    .builder {
      display: grid;
      grid-template-columns: minmax(0, 1.18fr) minmax(310px, 0.82fr);
      gap: 18px;
      align-items: start;
    }

    .panel {
      padding: 22px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(14px);
    }

    .field-group + .field-group { margin-top: 22px; }
    .field-label {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      margin: 0 0 10px;
      color: #e8e8f2;
      font-size: 0.8rem;
      font-weight: 750;
      letter-spacing: 0.01em;
    }
    .field-label span { color: var(--muted-2); font-size: 0.7rem; font-weight: 500; }

    .services {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
      gap: 8px;
    }

    .service {
      position: relative;
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 42px;
      padding: 0 10px;
      color: #d4d4e0;
      background: rgba(255, 255, 255, 0.025);
      border: 1px solid var(--line);
      border-radius: 10px;
      cursor: pointer;
      transition: border-color 150ms ease, background 150ms ease, transform 150ms ease;
      font-size: 0.78rem;
      font-weight: 650;
      user-select: none;
    }

    .service:hover { border-color: rgba(255,255,255,0.2); transform: translateY(-1px); }
    .service input { position: absolute; opacity: 0; pointer-events: none; }
    .service__mark {
      width: 16px;
      height: 16px;
      flex: 0 0 auto;
      border: 1px solid color-mix(in srgb, var(--service) 55%, transparent);
      border-radius: 5px;
      background: color-mix(in srgb, var(--service) 24%, transparent);
      box-shadow: 0 0 12px color-mix(in srgb, var(--service) 20%, transparent);
    }
    .service__check {
      display: grid;
      place-items: center;
      width: 15px;
      height: 15px;
      flex: 0 0 auto;
      border: 1px solid rgba(255,255,255,0.28);
      border-radius: 4px;
      color: #08080d;
      font-size: 11px;
      font-weight: 950;
    }
    .service input:checked ~ .service__check { background: var(--accent); border-color: var(--accent); }
    .service input:checked ~ .service__check::after { content: "✓"; }
    .service:has(input:checked) {
      border-color: color-mix(in srgb, var(--service) 38%, transparent);
      background: color-mix(in srgb, var(--service) 8%, transparent);
    }
    .service input:focus-visible ~ .service__check { outline: 2px solid var(--accent); outline-offset: 2px; }

    .segmented {
      display: inline-flex;
      gap: 3px;
      padding: 3px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--line);
      border-radius: 10px;
    }

    .segmented label {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 7px;
      color: var(--muted);
      cursor: pointer;
      font-size: 0.77rem;
      font-weight: 650;
      transition: background 150ms ease, color 150ms ease;
    }
    .segmented input { position: absolute; opacity: 0; pointer-events: none; }
    .segmented label:has(input:checked) { color: #fff; background: rgba(167, 139, 250, 0.17); box-shadow: inset 0 0 0 1px rgba(167,139,250,0.22); }
    .segmented input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 3px; }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    .field > span { color: var(--muted-2); font-size: 0.68rem; font-weight: 650; }

    select, input[type="text"], input[type="number"], .url-input {
      width: 100%;
      min-height: 40px;
      padding: 0 10px;
      color: var(--text);
      background: rgba(8, 8, 13, 0.68);
      border: 1px solid var(--line);
      border-radius: 9px;
      outline: none;
      transition: border-color 150ms ease, box-shadow 150ms ease;
      font-size: 0.78rem;
    }
    select:focus, input:focus, .url-input:focus { border-color: rgba(167, 139, 250, 0.55); box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.12); }
    select option { color: #f4f4f8; background: #171720; }

    .result { position: sticky; top: 20px; }
    .result__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    .result__head h3 { margin: 0; font-size: 0.98rem; letter-spacing: -0.01em; }
    .result__count { color: var(--muted-2); font-size: 0.7rem; font-variant-numeric: tabular-nums; }

    .preview-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      max-height: 194px;
      overflow: auto;
      padding: 2px 2px 4px;
      margin-bottom: 14px;
      scrollbar-width: thin;
    }

    .preview-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      color: #d7d7e4;
      background: rgba(255,255,255,0.035);
      border: 1px solid var(--line);
      border-radius: 7px;
      font-size: 0.64rem;
      font-weight: 600;
    }
    .preview-chip i { width: 5px; height: 5px; border-radius: 999px; background: var(--service); }

    .url-box {
      display: flex;
      gap: 7px;
      align-items: stretch;
    }
    .url-box input {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.68rem;
      color: #cfcbe8;
      min-width: 0;
    }

    .result__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .result__actions .button { flex: 1 1 auto; }
    .result__actions .button--ghost { flex: 0 0 auto; }

    .status {
      min-height: 18px;
      margin: 10px 0 0;
      color: var(--muted-2);
      font-size: 0.68rem;
    }
    .status--warn { color: var(--warn); }
    .status--ok { color: var(--ok); }

    .note {
      margin: 16px 0 0;
      padding-top: 14px;
      color: var(--muted-2);
      border-top: 1px solid var(--line);
      font-size: 0.68rem;
      line-height: 1.55;
    }
    .note strong { color: var(--muted); }

    .features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      padding-top: 18px;
    }

    .feature {
      padding: 20px;
      background: rgba(255, 255, 255, 0.018);
      border: 1px solid var(--line);
      border-radius: 15px;
    }
    .feature__icon {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      margin-bottom: 12px;
      color: #d8ccff;
      background: rgba(167, 139, 250, 0.11);
      border: 1px solid rgba(167, 139, 250, 0.2);
      border-radius: 9px;
      font-size: 0.9rem;
    }
    .feature h3 { margin: 0 0 5px; font-size: 0.88rem; }
    .feature p { margin: 0; color: var(--muted); font-size: 0.76rem; line-height: 1.55; }

    .about {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      align-items: start;
      padding: 34px 0 16px;
    }
    .about h2 { max-width: 420px; }
    .about p { color: var(--muted); font-size: 0.9rem; }
    .about p + p { margin-top: 12px; }
    .about a { text-decoration-color: rgba(196,181,253,0.35); text-underline-offset: 3px; }

    .footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 30px;
      margin-top: 30px;
      color: var(--muted-2);
      border-top: 1px solid var(--line);
      font-size: 0.7rem;
    }
    .footer__links { display: flex; gap: 14px; }

    .sr-only {
      position: absolute;
      width: 1px; height: 1px;
      padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0,0,0,0);
      white-space: nowrap; border: 0;
    }

    @media (max-width: 900px) {
      .hero { grid-template-columns: 1fr; padding-top: 6px; }
      .hero__visual { display: none; }
      .builder { grid-template-columns: 1fr; }
      .result { position: static; }
      .about { grid-template-columns: 1fr; gap: 14px; }
      .features { grid-template-columns: 1fr; }
    }

    @media (max-width: 560px) {
      .shell { width: calc(100% - 26px); }
      .nav { padding-bottom: 20px; }
      .nav__meta { display: none; }
      .hero { padding-bottom: 34px; }
      .hero__actions .button { flex: 1 1 100%; }
      .panel { padding: 17px; }
      .grid-2 { grid-template-columns: 1fr; }
      .section-head { display: block; }
      .section-head p { margin-top: 8px; }
      .services { grid-template-columns: 1fr 1fr; }
      .row { grid-template-columns: 20px 34px minmax(0,1fr) auto; }
      .row__art { width: 34px; height: 48px; }
    }

    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      * { transition: none !important; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <nav class="nav">
      <a class="brand" href="/">
        <img src="/logo.svg" alt="">
        StreamRank
      </a>
      <div class="nav__meta">
        <span class="pulse" aria-hidden="true"></span>
        Live charts · v${escapeHtml(version)}
      </div>
    </nav>

    <main>
      <section class="hero">
        <div>
          <p class="eyebrow">Stremio addon <span>·</span> 7 services</p>
          <h1>The charts, <em>without the scrolling.</em></h1>
          <p class="lede">
            Top movies and shows across <strong>Netflix, Hulu, Disney+, Apple TV+, Paramount+, HBO Max</strong>
            and <strong>Prime Video</strong> — in one Stremio board. Filter every row by genre, year,
            IMDb rating and sort order.
          </p>
          <div class="hero__actions">
            <a class="button" id="hero-install" href="${escapeHtml(installUrl)}">
              <span aria-hidden="true">▶</span> Install in Stremio
            </a>
            <a class="button button--ghost" href="#build">Build a filtered board</a>
          </div>
          <div class="service-strip" aria-label="Supported services">
            ${SERVICES.map(
              (service) =>
                `<span class="service-pill" style="--service:${escapeHtml(service.accent)}"><i aria-hidden="true"></i>${escapeHtml(service.name)}</span>`,
            ).join('')}
          </div>
        </div>

        <div class="hero__visual" aria-hidden="true">
          <div class="board">
            <div class="board__head">
              <div class="board__title">Tonight on your services</div>
              <div class="board__tag">Top 10</div>
            </div>
            ${renderPreviewRow(1, 'The Last of Us', 'HBO Max · Drama · 8.8', '#365314', '#84cc16', '8.8')}
            ${renderPreviewRow(2, 'Severance', 'Apple TV+ · Sci-Fi · 8.7', '#1e3a8a', '#38bdf8', '8.7')}
            ${renderPreviewRow(3, 'Shōgun', 'Disney+ · Drama · 8.6', '#7f1d1d', '#f97316', '8.6')}
            ${renderPreviewRow(4, 'Reacher', 'Prime Video · Action · 8.1', '#134e4a', '#2dd4bf', '8.1')}
            ${renderPreviewRow(5, 'The Bear', 'Hulu · Comedy · 8.5', '#4c1d95', '#c084fc', '8.5')}
            <div class="board__filters">
              <span class="mini-chip mini-chip--on">2020s</span>
              <span class="mini-chip mini-chip--on">8.0+</span>
              <span class="mini-chip">Any genre</span>
              <span class="mini-chip">Popular</span>
            </div>
          </div>
          <div class="float-card">
            <div class="float-card__icon">✓</div>
            <div><strong>14 catalog rows</strong>7 services · movies + shows</div>
          </div>
        </div>
      </section>

      <section class="section section--builder" id="build">
        <div class="section-head">
          <div>
            <p class="kicker">Make it yours</p>
            <h2>Build your board.</h2>
          </div>
          <p>Pick the services and filters you care about. StreamRank bakes them into a private manifest URL that installs straight into Stremio.</p>
        </div>

        <div class="builder">
          <form class="panel" id="builder-form" onsubmit="return false;">
            <div class="field-group">
              <p class="field-label">Services <span>Pick at least one</span></p>
              <div class="services" id="services">
                ${serviceCards}
              </div>
            </div>

            <div class="field-group">
              <p class="field-label">Rows <span>Each selected service gets one per type</span></p>
              <div class="segmented" id="types">
                <label><input type="checkbox" name="type" value="movie" checked><span>Movies</span></label>
                <label><input type="checkbox" name="type" value="series" checked><span>Shows</span></label>
              </div>
            </div>

            <div class="field-group">
              <p class="field-label">Filters <span>Leave blank for everything</span></p>
              <div class="grid-2">
                <label class="field"><span>Genre</span><select id="genre">${genreOptions}</select></label>
                <label class="field"><span>Region</span><select id="region">${countryOptions}</select></label>
              </div>
              <div class="grid-2" style="margin-top:10px">
                <label class="field"><span>Year from</span><select id="year-from">${yearOptions}</select></label>
                <label class="field"><span>Year to</span><select id="year-to">${yearOptions}</select></label>
              </div>
              <div class="grid-2" style="margin-top:10px">
                <label class="field"><span>Min IMDb rating</span><select id="rating">${ratingOptions}</select></label>
                <label class="field"><span>Sort by</span><select id="sort">${sortOptions}</select></label>
              </div>
            </div>
          </form>

          <aside class="panel result" aria-live="polite">
            <div class="result__head">
              <h3>Your manifest</h3>
              <span class="result__count" id="row-count">14 rows</span>
            </div>
            <div class="preview-chips" id="preview-chips"></div>
            <label class="field" for="manifest-url"><span>Manifest URL</span></label>
            <div class="url-box">
              <input class="url-input" id="manifest-url" type="text" readonly value="${escapeHtml(manifestUrl)}" aria-label="Manifest URL">
            </div>
            <div class="result__actions">
              <a class="button" id="install" href="${escapeHtml(installUrl)}">Install in Stremio</a>
              <button class="button button--ghost" id="copy" type="button">Copy</button>
            </div>
            <p class="status" id="status">The default board includes every service, movies and shows.</p>
            <p class="note">
              <strong>Local install:</strong> this URL works on the machine running StreamRank.
              For a TV or another device, use your computer's LAN address (for example
              <code>http://192.168.1.20:7100/manifest.json</code>) and keep the server running.
            </p>
          </aside>
        </div>
      </section>

      <section class="features" aria-label="How it works">
        <article class="feature">
          <div class="feature__icon" aria-hidden="true">▦</div>
          <h3>Real streaming charts</h3>
          <p>Rankings and availability come from JustWatch, the catalog data behind the streaming guides. Each row is ordered by popularity, not guesswork.</p>
        </article>
        <article class="feature">
          <div class="feature__icon" aria-hidden="true">⌁</div>
          <h3>Filters that stay put</h3>
          <p>Default rows expose genre, decade, rating and sort dropdowns in Stremio Discover. The builder also bakes exact filters into a dedicated manifest.</p>
        </article>
        <article class="feature">
          <div class="feature__icon" aria-hidden="true">◎</div>
          <h3>IMDb-linked metadata</h3>
          <p>Every title carries its IMDb ID, so Cinemeta and your existing stream add-ons resolve details and sources normally.</p>
        </article>
      </section>

      <section class="about">
        <div>
          <p class="kicker">Under the hood</p>
          <h2>A thin, fast layer over public catalog data.</h2>
        </div>
        <div>
          <p>
            StreamRank asks JustWatch for the most popular titles on each service in your region,
            applies the filters server-side, and maps the results to Stremio's catalog format.
            Responses are cached for ten minutes, so moving around Stremio does not hammer the
            upstream API.
          </p>
          <p>
            This addon provides <strong>metadata and discovery only</strong>. It does not host or
            stream video. Availability differs by country — choose your region above for accurate
            charts. JustWatch is an unofficial data source and its catalog can change without notice.
          </p>
        </div>
      </section>
    </main>

    <footer class="footer">
      <span>StreamRank v${escapeHtml(version)} · metadata by JustWatch · not affiliated with any streaming service.</span>
      <div class="footer__links">
        <a href="/healthz">Health</a>
        <a href="${escapeHtml(manifestUrl)}">Raw manifest</a>
      </div>
    </footer>
  </div>

  <script type="application/json" id="streamrank-data">${safeJson(data)}</script>
  <script>
    (() => {
      const DATA = JSON.parse(document.getElementById('streamrank-data').textContent);
      const form = document.getElementById('builder-form');
      const servicesBox = document.getElementById('services');
      const typesBox = document.getElementById('types');
      const genreSelect = document.getElementById('genre');
      const regionSelect = document.getElementById('region');
      const yearFromSelect = document.getElementById('year-from');
      const yearToSelect = document.getElementById('year-to');
      const ratingSelect = document.getElementById('rating');
      const sortSelect = document.getElementById('sort');
      const urlInput = document.getElementById('manifest-url');
      const installLink = document.getElementById('install');
      const heroInstall = document.getElementById('hero-install');
      const copyButton = document.getElementById('copy');
      const status = document.getElementById('status');
      const preview = document.getElementById('preview-chips');
      const rowCount = document.getElementById('row-count');

      const serviceByKey = new Map(DATA.services.map((service) => [service.key, service]));
      const genreByCode = new Map(DATA.genres.map((genre) => [genre.code, genre.name]));
      const sortByKey = new Map(DATA.sorts.map((sort) => [sort.key, sort.label]));
      const ratingByValue = new Map(DATA.ratings.map((rating) => [String(rating.min), rating.label]));

      function bestYear(value) {
        if (!value) return null;
        const number = Number(value);
        return Number.isInteger(number) && number >= 1900 ? number : null;
      }

      function readConfig() {
        const services = DATA.services
          .filter((service) => servicesBox.querySelector('input[value="' + service.key + '"]')?.checked)
          .map((service) => service.key);
        const types = ['movie', 'series'].filter(
          (type) => typesBox.querySelector('input[value="' + type + '"]')?.checked,
        );
        let yearFrom = bestYear(yearFromSelect.value);
        let yearTo = bestYear(yearToSelect.value);
        if (yearFrom !== null && yearTo !== null && yearFrom > yearTo) {
          [yearFrom, yearTo] = [yearTo, yearFrom];
        }

        return {
          services,
          types,
          genre: genreSelect.value || null,
          yearFrom,
          yearTo,
          minRating: ratingSelect.value ? Number(ratingSelect.value) : null,
          sort: sortSelect.value || 'popular',
          region: regionSelect.value || DATA.defaultRegion,
        };
      }

      function isDefault(config) {
        return (
          config.services.length === DATA.services.length &&
          config.services.every((key, index) => key === DATA.services[index].key) &&
          config.types.length === 2 &&
          config.genre === null &&
          config.yearFrom === null &&
          config.yearTo === null &&
          config.minRating === null &&
          config.sort === 'popular' &&
          config.region === DATA.defaultRegion
        );
      }

      function encodeConfig(config) {
        const bytes = new TextEncoder().encode(JSON.stringify(config));
        let binary = '';
        for (const byte of bytes) binary += String.fromCharCode(byte);
        return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
      }

      function toStremio(url) {
        return url.replace(/^https?:\\/\\//, 'stremio://');
      }

      function yearLabel(config) {
        if (config.yearFrom && config.yearTo) return config.yearFrom + '–' + config.yearTo;
        if (config.yearFrom) return config.yearFrom + '+';
        if (config.yearTo) return 'Up to ' + config.yearTo;
        return '';
      }

      function catalogName(service, type, config) {
        const base = service.name + ' · ' + (type === 'movie' ? 'Movies' : 'Shows');
        const bits = [];
        if (config.genre) bits.push(genreByCode.get(config.genre) || config.genre);
        const year = yearLabel(config);
        if (year) bits.push(year);
        if (config.minRating !== null) bits.push((Math.round(config.minRating * 10) / 10).toFixed(1) + '+');
        if (config.sort !== 'popular') bits.push(sortByKey.get(config.sort) || 'Popular');
        return bits.length ? base + ' · ' + bits.join(' · ') : base;
      }

      function render(config) {
        const noService = config.services.length === 0;
        const noType = config.types.length === 0;
        const invalid = noService || noType;
        const base = DATA.baseUrl;

        if (invalid) {
          urlInput.value = '';
          installLink.setAttribute('href', '#');
          installLink.setAttribute('aria-disabled', 'true');
          heroInstall.setAttribute('href', base + '/manifest.json');
          status.textContent = noService ? 'Pick at least one service.' : 'Pick movies, shows, or both.';
          status.className = 'status status--warn';
          rowCount.textContent = '0 rows';
          preview.innerHTML = '';
          return;
        }

        const path = isDefault(config)
          ? '/manifest.json'
          : '/c/' + encodeConfig(config) + '/manifest.json';
        const url = base + path;

        urlInput.value = url;
        installLink.setAttribute('href', toStremio(url));
        installLink.removeAttribute('aria-disabled');
        heroInstall.setAttribute('href', toStremio(url));

        const names = [];
        for (const key of config.services) {
          const service = serviceByKey.get(key);
          for (const type of config.types) names.push(catalogName(service, type, config));
        }

        rowCount.textContent = names.length + (names.length === 1 ? ' row' : ' rows');
        preview.innerHTML = names
          .map((name) => {
            const service = DATA.services.find((entry) => name.startsWith(entry.name + ' · '));
            const color = service ? service.accent : '#a78bfa';
            return '<span class="preview-chip"><i style="--service:' + color + ';background:' + color + '"></i>' + escapeHtml(name) + '</span>';
          })
          .join('');

        status.textContent = isDefault(config)
          ? 'Default board selected — all filters editable inside Stremio Discover.'
          : 'Custom board ready — filters are baked into this manifest.';
        status.className = 'status status--ok';
      }

      function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (character) => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        })[character]);
      }

      form.addEventListener('input', () => render(readConfig()));
      form.addEventListener('change', () => render(readConfig()));

      copyButton.addEventListener('click', async () => {
        if (!urlInput.value) return;
        try {
          await navigator.clipboard.writeText(urlInput.value);
          status.textContent = 'Manifest URL copied.';
          status.className = 'status status--ok';
        } catch {
          urlInput.select();
          document.execCommand('copy');
          status.textContent = 'Manifest URL copied.';
          status.className = 'status status--ok';
        }
      });

      render(readConfig());
    })();
  </script>
</body>
</html>`;
}

function renderPreviewRow(rank, name, meta, colorA, colorB, score) {
  return `
    <div class="row">
      <div class="row__rank">${rank}</div>
      <div class="row__art" style="--art-a:${colorA};--art-b:${colorB}"></div>
      <div class="row__copy">
        <div class="row__name">${escapeHtml(name)}</div>
        <div class="row__meta">${escapeHtml(meta)}</div>
      </div>
      <div class="row__score">★ ${escapeHtml(score)}</div>
    </div>`;
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function toStremioUrl(url) {
  return String(url).replace(/^https?:\/\//, 'stremio://');
}

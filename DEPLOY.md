# Deploy StreamRank for free

StreamRank is a single stateless Node/Express container. There is no database, no API key and no writable disk, so it fits free container hosts well.

The easiest no-card option is **Render** with the included [`render.yaml`](render.yaml). Render builds the Dockerfile and gives you a public `https://…onrender.com` URL.

This repository is currently deployed at **<https://streamrank-pgs1.onrender.com/>**. The manifest URL is `https://streamrank-pgs1.onrender.com/manifest.json`.

## Option A — Render (recommended, no credit card)

### 1. Push the project to GitHub

Create an empty repository on GitHub, then from this folder:

```bash
git init
git add .
git commit -m "StreamRank Stremio addon"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

A private repository is fine; Render can connect to it through the GitHub app.

### 2. Create the Render service

1. Sign in at <https://dashboard.render.com/>.
2. Choose **New +** → **Blueprint**.
3. Connect GitHub and select the repository.
4. Render detects `render.yaml`; click **Apply**.
5. Wait for the Docker build and the health check at `/healthz`.

The blueprint creates one free web service in Oregon with:

- `REGION=US` — change this to `GB`, `CA`, `AU`, `NZ` or `DE` for another storefront.
- `CACHE_TTL_MS=600000` — ten-minute catalog cache.

### 3. Install it in Stremio

Open the Render URL in a browser, for example:

```text
https://streamrank.onrender.com/
```

Use **Install in Stremio**, or add this URL in Stremio → Addons → **+ Add addon**:

```text
https://streamrank.onrender.com/manifest.json
```

Anyone can install that same URL. The builder page creates shareable custom links too.

## The free-tier catch: cold starts

Render's free web service has **512 MB RAM**, **0.1 CPU**, **750 instance-hours/month** and **5 GB bandwidth/month**. It **spins down after 15 minutes without traffic** and takes roughly a minute to wake.

That matters for a Stremio addon: the first catalog request after a spin-down can time out. Workarounds:

- Open the Render URL in a browser first, wait for the landing page, then browse in Stremio.
- Optionally point a free uptime pinger such as <https://cron-job.org/> at `/healthz` every 10 minutes. One always-on free service uses about 730 of the 750 monthly hours, so this stays inside the allowance. It is still a hobby tier with no SLA; Render labels free services "not for production".
- If someone uses a custom domain, add it in Render and set `PUBLIC_URL=https://your-domain.example` so generated manifest/logo URLs use that domain.

## Option B — Google Cloud Run (needs a billing account)

Cloud Run's always-free allowance is **180,000 vCPU-seconds, 360,000 GiB-seconds and 2 million requests per month**. It scales to zero but wakes in seconds rather than a minute, which is much nicer for Stremio.

```bash
gcloud run deploy streamrank \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 7100 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 3
```

Cloud Run prints the public URL. A card is required even though the free allowance is generous.

## Option C — Oracle Cloud Always Free (always on, more setup)

Oracle's Always Free Arm VM can run the container 24/7 with no cold starts. It needs a card and phone verification, and Arm capacity is not always available. Put Caddy or nginx in front for HTTPS, run the container on port 7100, and set `PUBLIC_URL` to the public origin. This is the cheapest genuinely always-on option, but it is a small server-administration project rather than a one-click deploy.

## Option D — Cloudflare Workers (best free fit, needs a port)

Cloudflare Workers give **100,000 requests/day**, no cold starts and no card. The catch is that Workers do not run Express; the routes would need to be ported to a `fetch` handler. For a public addon this is the best long-term free target. The current code is deliberately small and most modules are already runtime-neutral, so this port is practical.

## Public-use checklist

- **Region:** `REGION` controls the JustWatch storefront; it is not geolocated per visitor.
- **Traffic:** the free tiers are hobby-sized. If the addon gets popular, add rate limiting and a longer cache, or move to a paid instance.
- **Upstream:** JustWatch's GraphQL endpoint is public but undocumented. Heavy shared use could get rate-limited; the client already retries and serves stale cache.
- **No secrets:** there are no API keys or user accounts to protect. CORS is intentionally open because Stremio's web client fetches the addon from a different origin.
- **No streams:** StreamRank only supplies catalogs and metadata. Playback still comes from the user's installed stream addons.

# Polaris

A complete fresh application foundation for Polaris, deployed as a Cloudflare Worker with static assets and a JSON API.

## Local development

```bash
npm install
npm run dev
```

## Cloudflare setup

Set the Discord bot API token if you want to use the authenticated bot endpoints:

```bash
npx wrangler secret put DISCORD_API_TOKEN
```

Deploy:

```bash
npm run deploy
```

R2 storage is optional and is not required to deploy Polaris. Until storage is configured, `GET /api/shared-games` returns an empty list with `storageConfigured: false`, and uploads return HTTP 503.

## API routes

- `GET /api` — API index
- `GET /api/health` — health check
- `GET /api/status` — service status and deployment build ID
- `GET /api/version` — version metadata
- `GET /api/games` — public game catalogue
- `GET /api/shared-games` — list shared games when optional storage is configured
- `POST /api/shared-games` — upload an HTML game when optional storage and `GAME_UPLOAD_TOKEN` are configured
- `GET /api/stats` — usage statistics
- `GET /api/discord-presence` — presence endpoint placeholder

### Discord bot endpoints

These endpoints require `Authorization: Bearer YOUR_DISCORD_API_TOKEN`:

- `GET /api/bot/status`
- `GET /api/bot/games`
- `GET /api/bot/stats`

Example (Node.js):

```js
const response = await fetch("https://YOUR-POLARIS-DOMAIN/api/bot/status", {
  headers: { Authorization: `Bearer ${process.env.POLARIS_API_TOKEN}` }
});
const data = await response.json();
console.log(data);
```

Keep the token server-side. Never put it in browser JavaScript or commit it to GitHub.

## Pages

Overview, Discover, My library, Toolkit, AI workspace, Changelog, Feedback and Settings.

The initial game catalogue, statistics and Discord presence endpoints return starter values until their backing data sources are connected. The personal library is currently browser-local.

## Polaris Engine

Polaris includes the modular Polaris Engine runtime and an experimental custom canvas renderer. The renderer has its own document model, HTML parser, CSS style engine, layout engine and paint engine; it is not an iframe wrapper. It now includes a larger DOM-like runtime, bubbling events, mutation observation, form handling, responsive media-query evaluation, basic images, history and accessibility-tree support. Page JavaScript is only delegated to an explicitly supplied isolated engine adapter; no page code is executed in the Polaris host realm. Full browser compatibility is still a long-term goal. The standard iframe adapter remains a separate optional fallback and is subject to websites' framing restrictions. See `public/engine/modules/docs/RENDERER.md` for details.

The Engine also includes `SessionPersistence` for saving and restoring named tab sessions. See `public/engine/modules/docs/SESSION-PERSISTENCE.md`.

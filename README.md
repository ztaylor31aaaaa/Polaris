# Polaris

A complete fresh application foundation for Polaris, deployed as a Cloudflare Worker with static assets and a JSON API.

## Local development

```bash
npm install
npm run dev
```

## Cloudflare setup

Create the R2 bucket:

```bash
npx wrangler r2 bucket create polaris-games
```

Set the upload secret and Discord bot API token:

```bash
npx wrangler secret put GAME_UPLOAD_TOKEN
npx wrangler secret put DISCORD_API_TOKEN
```

Deploy:

```bash
npm run deploy
```

## API routes

- `GET /api` — API index
- `GET /api/health` — health check
- `GET /api/status` — service status and deployment build ID
- `GET /api/version` — version metadata
- `GET /api/games` — public game catalogue
- `GET /api/shared-games` — list games stored in R2
- `POST /api/shared-games` — upload an HTML game; requires `X-Upload-Token`
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

Keep both secrets server-side. Never put them in browser JavaScript or commit them to GitHub.

## Pages

Overview, Discover, My library, Toolkit, AI workspace, Changelog, Feedback and Settings.

The initial game catalogue, statistics and Discord presence endpoints return starter values until their backing data sources are connected. The personal library is currently browser-local.

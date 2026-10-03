# Ride Score

A local-first PWA for recording ride disturbance from an iPhone's motion and GPS sensors. Ride data remains in the browser's IndexedDB storage.

## Run locally

```bash
npm install
npm run dev
```

## Checks

```bash
npm run typecheck
npm test
npm run build
```

## Deploy

The project is configured for Cloudflare Workers Static Assets. Connect the repository in Workers Builds, use `npm run build` as the build command, and `npx wrangler deploy` as the deploy command.

For real ride recording, test on a rigidly mounted iPhone over HTTPS with the app open in the foreground.

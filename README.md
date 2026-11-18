# still.

A free, private, offline yoga, breathwork and meditation app. It lives at https://still.irshath.com.

There is no account and no server. Everything a person does stays in their browser on their own device. Backups are a JSON file they export and import themselves.

## What it does

- 31 guided practices: yoga sequences, sun salutations, yin, meditation (breath awareness, body scan, loving-kindness, noting and more) and breathwork (box, 4-7-8, coherent, alternate nostril).
- Three multi-day paths for beginners.
- A library of 68 poses, each drawn by the app as a figure. Each figure morphs smoothly into the next pose.
- A get-ready gap before every pose, with the name and setup read aloud. You can set its length or have the app wait for your tap.
- The screen stays on during a practice (Screen Wake Lock, with a muted video fallback). Timing comes from the wall clock, so a frozen or backgrounded tab picks up where it should be.
- Bells, background sounds and voice guidance all work offline.
- Build your own practices. Add your own poses with your own photos, videos or links.
- A journal with streaks, a calendar, a feeling and a note for every session.
- Share a practice with a link. The practice travels inside the link itself.
- Installable as a PWA, with full offline support after the first visit.

## Stack

- [Solid 2.0](https://github.com/solidjs/solid) and `@solidjs/router` 2.0, a single-page app.
- Vite 8 with `vite-plugin-pwa` (Workbox `generateSW`).
- IndexedDB for storage. valibot validates imports and share links at the boundary.
- Cloudflare Workers static assets for hosting.

## Layout

- `src/domain` holds pure logic: types, the timeline compiler, the player state machine and journal stats. It has unit tests.
- `src/content` holds the built-in poses, practices and paths.
- `src/figure` draws poses from a small forward-kinematics skeleton.
- `src/engine` holds browser integrations: audio, speech, wake lock and media session.
- `src/store` holds IndexedDB, schemas, backup, merge and share links.
- `src/state` holds the app store. `src/screens` and `src/ui` hold the interface.
- `src/seo.ts` holds page titles and descriptions. `scripts/seo-plugin.ts` uses it at build time to prerender every public page with its share card, plus `sitemap.xml` and `robots.txt`.

## Develop

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev          # local dev server
npm test             # unit tests (vitest)
npm run e2e          # end-to-end tests against a production build (Playwright)
npm run build        # type-check and build
```

The pose gallery at `/gallery.html` (dev server only) shows every figure side by side.

To regenerate the app icons after changing `public/icons/icon.svg`, run `node scripts/icons.mjs`.

The link preview image `public/og.jpg` is a photograph of the real app. After a visual change, build, run `npx vite preview --port 4390`, then `node scripts/og.mjs http://localhost:4390`.

## Deploy

Every push to `main` runs the type-check, unit tests and end-to-end tests, then deploys with `cf deploy` (see `.github/workflows/deploy.yml`). Pull requests get the same checks and a dry-run deploy. The workflow needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.

## Credits and licences

- Sounds are CC0 recordings from freesound.org by zambolino, dersinnsspace, kerozenne, pazdalma, unfa, derjuli, upkey and yurkobb.
- Safety guidance is adapted from NCCIH, "Yoga: What You Need To Know" (public domain). NCCIH does not endorse this app.
- Fraunces and Inter are under the SIL Open Font License.
- Practices, scripts and pose instructions are original writing, shared under CC BY 4.0.

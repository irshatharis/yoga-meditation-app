# Still · Yoga & Meditation

A personal, offline-capable Yoga + Meditation PWA built with React and TypeScript.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Production build

```bash
npm run build
npm run preview
```

The production build is in `dist/`.

## Install as an app

Deploy the `dist/` folder to any static host with HTTPS (for example Cloudflare Pages, Netlify, or Vercel). Open the deployed URL:

- **iPhone/iPad:** Safari → Share → Add to Home Screen.
- **Mac/Chrome:** use the install icon in the address bar, or Chrome menu → Cast, save, and share → Install page as app.

The app caches its built assets for offline use after the first successful load. Voice availability depends on the browser and installed system voices.

## Updating your routine

Yoga and meditation steps live in `src/routines.ts`. Each step has an `id`, `title`, `duration` (seconds), and spoken `instruction`; an optional `cue` can add a short reminder. Add, remove, reorder, or edit steps there.

User-adjustable preferences are stored locally in the browser. The yoga sun-salutation duration is currently estimated at 90 seconds per round; change the calculation in `src/App.tsx` if you want a different default.

## Notes

- No account, backend, analytics, or external database.
- Settings are stored on the current device/browser.
- The first version does not sync settings between devices.
- Silent meditation uses a bell at the end. Guided meditation speaks the instruction at the start of each stage.

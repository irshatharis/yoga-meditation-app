# still. Rebuild plan

Status: proposed, 2026-11-18. Branch `still-solid2`.

## 1. What we are building

A free, offline-first yoga, breathwork and meditation practice app for anyone. No account, no backend, no tracking. Everything a person creates or completes lives on their device and can be exported, imported and shared as a file or a link. It installs as a PWA, keeps the screen awake while a practice runs, and gives a calm, unhurried pause between poses.

Live at `https://still.irshath.com`. The old `yoga.irshath.com` redirects there permanently.

## 2. Bugs in the current app that shape the design

Each of these is a design flaw, not a typo, so the rebuild removes the cause rather than patching it.

| Bug | Cause | Fix in the new design |
| --- | --- | --- |
| Practice stops when the screen locks | No Wake Lock. Timer counts `setInterval` ticks, so throttled or frozen JS loses time | Wake Lock with re-acquire on visibility change. Clock derives position from wall-clock timestamps, never from tick counts |
| Little or no gap between poses | Steps advance the moment a counter hits 0 | Timeline compiler inserts explicit `prepare` and `switch-sides` segments |
| App can reload mid-session | `registerType: 'autoUpdate'` swaps the service worker and reloads | Update is offered as a prompt and never applied while a practice runs |
| Pose can be skipped, cue spoken twice | Side effects (`setIndex`, `speak`) inside a state updater, double-invoked in StrictMode | Player is a pure state machine. Cues fire from an idempotent scheduler keyed by `segment:cue` |
| Bell often silent, worst after a lock | A new `AudioContext` per bell, created outside a user gesture | One audio engine, unlocked on the Start tap, reused for every sound |
| Closing the tab loses the session | Session state lives only in component memory | Active session is persisted and offered as "Resume" on next open |
| Guided meditation ignores settings, copy says "18-step" | Hard-coded values | Everything derives from data and settings |
| iOS install icon is blank or cropped | Only an SVG icon, marked `any maskable` | Generated PNG set, separate maskable icon, `apple-touch-icon` |
| No record of practice | Not built | Journal with per-day history, streaks and totals |

## 3. Stack

| Concern | Choice | Why |
| --- | --- | --- |
| UI | `solid-js@2.0.0` + `@solidjs/web@2.0.0` | Requested. Fine-grained reactivity fits a ticking player |
| Routing | `@solidjs/router@2.0.0` with `createRouter` config and plain `<a>` links | Official Solid 2 router, typed `paths` |
| Build | Vite 8 + `@solidjs/vite-plugin@3` | `vite-plugin-solid` moved to this package for Solid 2 |
| PWA | `vite-plugin-pwa@2` (Workbox, `injectManifest` or `generateSW` with prompt) | Precache everything for full offline use |
| Storage | IndexedDB through a tiny typed wrapper, `navigator.storage.persist()` | Holds media blobs and large history. `localStorage` caps near 5 MB |
| Validation | `valibot` at the import and storage boundary only | Small, typed parse of untrusted files and links |
| Hosting | Cloudflare Workers static assets via the existing `cf` CLI | Already wired. No R2 or backend needed (see 10) |
| Tests | Vitest for the pure core, Playwright for end-to-end | Behavior tests on the real built app |
| Fonts | Self-hosted woff2 (Fraunces for display, Inter for text) | Precached so the offline app looks the same |

Solid 2 rules this code follows: `createEffect(compute, apply)` two-phase effects, `onSettled` for mount and cleanup, draft-style `createStore` setters, no writes in owned scope, props read as `props.x` and never destructured, `<Loading>` and `<Errored>` boundaries, `class={{...}}` object form, `<For>` keyed callback shapes. The bundled `solid-js` cheatsheet is the reference.

## 4. Domain model

Content and progress are data. The player only ever sees a compiled timeline.

```ts
type PoseId = Brand<string, 'PoseId'>
type PracticeId = Brand<string, 'PracticeId'>
type Seconds = Brand<number, 'Seconds'>

type Pose = {
  id: PoseId
  name: string
  sanskrit?: string
  family: 'standing' | 'balance' | 'seated' | 'kneeling' | 'prone' | 'supine' | 'inversion' | 'twist' | 'rest'
  level: 'gentle' | 'moderate' | 'strong'
  sided: boolean
  setup: string[]
  cues: string[]
  cautions: string[]
  easier?: string
  figure?: FigureId
  media: MediaRef[]
  origin: Origin
}

type MediaRef =
  | { kind: 'image' | 'video'; blob: BlobId }
  | { kind: 'link'; href: string }

type PracticeItem =
  | { type: 'pose'; pose: PoseId; hold: Seconds; sides?: 'both' | 'left' | 'right'; note?: string }
  | { type: 'flow'; name: string; steps: FlowStep[]; rounds: number; breath: Seconds }
  | { type: 'sit'; title: string; duration: Seconds; guidance: TimedCue[]; intervalBell?: Seconds }
  | { type: 'breath'; title: string; pattern: BreathPattern; cycles: number }
  | { type: 'rest'; title: string; duration: Seconds }

type Practice = {
  id: PracticeId
  title: string
  summary: string
  kind: 'yoga' | 'meditation' | 'breath' | 'mixed'
  level: Pose['level']
  items: PracticeItem[]
  pacing?: Partial<Pacing>
  origin: Origin
}

type Pacing = { prepare: Seconds; switchSides: Seconds; waitForMe: boolean }

type Segment =
  | { kind: 'prepare'; next: SegmentTarget; duration: Seconds; cues: TimedCue[] }
  | { kind: 'switch'; next: SegmentTarget; duration: Seconds; cues: TimedCue[] }
  | { kind: 'hold' | 'flow-step' | 'sit' | 'breath' | 'rest'; target: SegmentTarget; duration: Seconds; cues: TimedCue[] }

type PlayerState =
  | { status: 'ready'; timeline: Segment[] }
  | { status: 'running'; timeline: Segment[]; anchor: EpochMs; offset: Ms }
  | { status: 'paused'; timeline: Segment[]; position: Ms }
  | { status: 'waiting'; timeline: Segment[]; position: Ms }
  | { status: 'done'; timeline: Segment[]; log: SessionLog }

type SessionLog = {
  id: string
  practice: PracticeId
  title: string
  kind: Practice['kind']
  startedAt: EpochMs
  endedAt: EpochMs
  planned: Seconds
  practiced: Seconds
  completed: boolean
  feeling?: 1 | 2 | 3 | 4 | 5
  note?: string
}
```

Key decisions:

- `compile(practice, library, settings) => Segment[]` is pure. Prepare gaps, side switches, flow rounds and breath cycles are all expanded here, so the player has no special cases.
- Position is `now - anchor + offset`, so a frozen tab or a locked screen catches up correctly on return. No tick ever "counts" time.
- Cues are keyed `segmentIndex:cueId`. Firing is idempotent, so a re-render or resume never repeats a cue.
- Built-in content is code (versioned, precached). User content is stored in IndexedDB with `origin: 'mine' | 'imported'`. Editing a built-in practice forks it into a user copy.

## 5. Features

**Practice**
- Player with a large pose figure, the current instruction, a calm progress ring, and an up-next card.
- Prepare segment before every pose (default 10 s, configurable 0 to 30 s). Shows the next pose, speaks its name and setup, soft 3-2-1 ticks, then a bell to begin.
- Side switch segment (default 5 s) for one-sided poses.
- "Wait for me" mode. The player pauses at each prepare until the person taps continue.
- Flows (sun salutations, cat-cow) paced by breath, with "inhale, reach up" cues and alternating lead leg per round.
- Breathwork with an animated breath orb synced to the pattern (box, 4-7-8, coherent, extended exhale).
- Meditation with timed spoken guidance, optional interval bells, and a silent timer mode.
- Controls: pause, resume, back, skip, +15 s, end early. Keyboard shortcuts. Lock-screen controls via Media Session.
- Session survives reload or tab close and offers to resume.

**Stay awake**
- Screen Wake Lock on start, released on pause and exit, re-acquired after the app returns to the foreground.
- Fallback for browsers without Wake Lock: a muted inline looping video.
- One persistent audio engine, so bells and voice continue to work after a resume.

**Library**
- About 55 poses with original setup steps, cues, cautions and easier options.
- About 25 built-in practices across yoga, meditation and breathwork, including today's personal routine kept as "Morning flow".
- Two multi-day paths (a 7-day yoga start and a 10-day meditation start) with per-day progress.
- Search and filter by kind, length, level and body focus.
- Practice builder: add poses, drag to reorder, set holds and sides, set per-practice pacing. Editing a built-in creates a copy.
- Custom poses with your own photo or short video, stored on the device.

**Progress**
- Journal: calendar heatmap, current and longest streak, minutes this week, per-kind totals.
- Day view: every session that day with duration, completion and an optional feeling and note.
- Optional daily goal in minutes.

**Data**
- Export everything to one `.still.json` file, with an option to include media.
- Import with a preview and merge rules (skip, replace, keep both).
- Share one practice as a link. The practice is compressed into the URL fragment, so the link works with no server.
- Request persistent storage so the browser does not evict data.

**Settings**
Prepare and switch times, wait-for-me, voice on or off, voice choice, speech rate, cue detail (full, name only, bells only), bell sound and volume, countdown ticks, halfway cue, ambient sound (synthesized, none by default), keep awake, haptics, theme (system, light, dark), reduce motion, week start, daily goal.

**Quality bar**
- Calm visual system: warm paper light theme, deep dusk dark theme, serif display type.
- Motion: view transitions between screens, the figure morphs between poses, the breath orb, gentle progress. All of it respects `prefers-reduced-motion`.
- Works at 320 px width up to desktop. Thumb-reachable controls in the player.
- Accessible: labelled controls, focus rings, live region for the current pose, contrast checked.
- Safety copy where it matters (pregnancy, injuries, blood pressure on inversions), never preachy.

**Not in v1, on purpose**
- Reminders. Reliable scheduled notifications need a push server, which conflicts with "no backend".
- Cloud sync and accounts.
- Localization. Strings are centralized so it can come later.

## 6. Pose imagery

The app needs a picture for every pose, and every one must be licensable and look like one family. Copying photos from the web fails the license test. The best-known open dataset (`alexcumplido/yoga-api`, MIT code) serves images of unclear origin, so its images are out.

Plan: draw our own. Each pose is a small joint-angle skeleton (`FigureId` keys into a table), rendered as a soft rounded SVG figure. Because poses share one skeleton, the player can morph smoothly from one pose to the next, and flows like cat-cow animate in place. That covers the "video" need with zero asset weight and works offline. People can still attach their own photo or video to any pose.

This is the riskiest unknown, so it is prototyped first. Two candidates go head to head on six hard poses (downward dog, warrior II, tree, child's pose, triangle, pigeon):

1. Joint-angle skeleton rendered as capsules.
2. Hand-authored SVG path per pose.

The comparison is a screenshot sheet. If neither looks good enough, the fallback is clean typographic cards with Sanskrit and English names, and that choice gets reported, not hidden.

## 7. Content and licensing

I looked for openly licensed yoga and meditation programs to reuse. Findings:

- UCLA Mindful guided meditations are CC BY-NC-ND. No derivatives, so they cannot be adapted into timed cues.
- Free Mindfulness Project exercises are CC BY-NC-SA audio, not scripts.
- No permissively licensed, well-sourced pose or plan dataset turned up.

Decision: write original content. Asana sequences and traditional techniques (sun salutations, body scan, loving-kindness, box breathing, alternate nostril breathing) are long-standing public practices and not copyrightable as such. Every instruction is written fresh for this app and credited in an About page with the traditions it draws on. The content ships under CC BY 4.0 so others can reuse it.

## 8. Architecture

```
src/
  domain/      types, compile(), player machine, streaks, pure and framework-free
  content/     built-in poses, figures, practices, paths
  figure/      skeleton model, SVG renderer, morph
  engine/      clock, audio (bells, ticks, ambient), speech, wake lock, media session, haptics
  store/       IndexedDB wrapper, schema, migrations, import/export, share links
  ui/          design tokens, primitives (Button, Sheet, Stepper, Slider)
  screens/     Today, Practices, Practice, Builder, Poses, Pose, Player, Journal, Settings, About
  app.tsx      router and providers
```

- `domain` has no Solid imports. It is where most tests live.
- `engine` adapts browser APIs and is the only place that touches them.
- `store` validates anything coming from disk, a file or a link, then hands typed data inward.
- State lives in a few context-provided stores (library, history, settings, active session), not module globals.

## 9. Phases

Each phase ends in a check that must pass before the next starts. Riskiest first.

| # | Phase | Ends when |
| --- | --- | --- |
| 0 | Remove React and old code. Scaffold Solid 2, router, Vite 8, PWA, Cloudflare plugin, Vitest, Playwright, CI | Empty app builds, routes render, CI green |
| 1 | Figure prototype, two approaches, screenshot sheet | One approach chosen and logged |
| 2 | Domain core: types, `compile`, player machine, streaks | Unit tests pass, including a 60 s clock-jump test |
| 3 | Engine: audio, speech queue, wake lock, media session, resume | Playwright with stubbed Wake Lock and fake clock passes |
| 4 | Content: poses, figures, practices, paths. A dev-only gallery shows every figure | Gallery screenshot reviewed, every practice compiles |
| 5 | Screens and design system | Screenshots at 375 px and 1280 px, light and dark, reviewed |
| 6 | Data: IndexedDB, export, import, share link | Round-trip test: export, wipe, import, deep-equal |
| 7 | PWA: icons, manifest, update prompt, offline | Chromium reports zero installability errors. Offline reload runs a full practice |
| 8 | Domain move and deploy: `still.irshath.com`, redirect from `yoga.irshath.com`, README, CI | Both URLs checked live |
| 9 | Final pass: accessibility, reduced motion, bundle budget, copy | Verification report attached to the PR |

Parallel work goes to subagents only across clean seams: figure data in batches once the renderer exists, meditation and breathwork scripts, and an independent verification pass at the end. Everything else stays in one thread because the pieces share types.

## 10. Cloudflare

Static assets on Workers, as today, with SPA fallback. A tiny Worker entry handles the 301 from `yoga.irshath.com` to `still.irshath.com`. Nothing needs R2 or a database. If someone later wants hosted pose videos, R2 is the place, but there is no licensed footage to host today.

## 11. Definition of done

All of these are checked against the built app, not inferred.

1. `tsc`, Vitest and Playwright pass locally and in CI.
2. Every pose segment is preceded by a prepare segment of the configured length, and one-sided poses get a switch segment (e2e).
3. After a simulated 60 s freeze, the player shows the correct segment and remaining time (e2e with fake clock).
4. Wake Lock is requested on start, released on pause and exit, and re-acquired on return to the foreground (e2e with a stubbed API).
5. Finishing a practice adds a journal entry on today's date with the right duration (e2e).
6. Export, clear all data, import restores identical data (e2e).
7. A shared practice link imports on a fresh profile (e2e).
8. After one online visit, the app loads and completes a practice fully offline (e2e).
9. Chromium reports no installability errors for the manifest and service worker.
10. `https://still.irshath.com` serves the new build, and `https://yoga.irshath.com` answers 301 to it.

Cannot be verified from this machine: real iPhone lock-screen and background-audio behavior. That needs a device check and is flagged in the PR.

## 12. Audit trail

Decisions are logged in `docs/decisions.md` as each phase lands. The PR links it.

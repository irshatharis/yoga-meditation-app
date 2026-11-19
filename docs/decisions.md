# Decisions

The record of choices made while rebuilding the app as still. Each entry gives the choice, the reason, and what was rejected.

## Platform

**Solid 2.0 SPA, no backend.** The brief asked for Solid 2.0, local-only data and no login. All state lives in IndexedDB. Cloudflare serves static assets only.

**IndexedDB over localStorage.** Users can attach photos and videos to poses. Those need binary storage and more room than localStorage allows. The app calls `navigator.storage.persist()` so the browser is less likely to evict data.

**valibot at the edges only.** Backups and share links come from outside, so they are parsed. Internal code trusts the domain types.

## Keeping a practice running

The old app used `setInterval` ticks, so a sleeping or throttled tab lost time and the screen locked mid-practice.

**Wall-clock player.** The position is `now - origin`. It is never accumulated from ticks. A frozen tab jumps to the right place when it wakes. Cues that are more than 2.5 s stale are dropped instead of played in a burst. The end-to-end test fast-forwards the clock 60 s to prove it.

**Screen Wake Lock, with a fallback.** The lock is requested on start and requested again whenever the page becomes visible, because browsers release it on hide. Where the API is missing, a muted looping video keeps the screen on. That is the long-standing technique for older iOS.

**Audio keep-alive and Media Session.** A near-silent looping audio element keeps the page treated as media playback. It also gives lock-screen controls. Not verified on a real iPhone (see Open).

## Pacing

**A get-ready segment before every pose.** The timeline compiler inserts `prepare` segments with the pose name and setup spoken. It also inserts `switch` segments between sides. The default is 10 s, configurable from 0 to 30 s per person and overridable per practice. "Wait for me" turns the gap into a gate that waits for a tap.

## Imagery

**Our own figures, not photos.** Research found no openly licensed pose photo set covering the library with a consistent look. The usable sets are partial, mixed in style, or NC-licensed. The app draws every pose from one forward-kinematics skeleton instead. This gives a single visual language, morphing between poses, mirrored left sides, dark mode, and zero licensing risk. People can still attach their own photos, videos or links to any pose.

## Content

**Original writing.** No permissively licensed meditation scripts were found. UCLA MARC is NC-ND. Medito's content is proprietary. Access to Insight and dhammatalks are NC. Yoga sequences themselves are not copyrightable (Bikram v. Evolation, 9th Cir. 2015), so classic sequences are written fresh. Commercial apps (Down Dog, Insight Timer, Calm, Headspace, Oak) were read for feature expectations only.

**Public-domain safety text.** The About page adapts NCCIH's "Yoga: What You Need To Know" with credit.

**CC0 sounds.** Eight recordings from freesound.org. The license was checked on each page. Synth fallbacks cover any sample that fails to load.

## Data

**Backups are plain JSON.** Photos and videos are optional base64 inside the file. Import shows a merge preview. Clashing items can be kept as copies, replaced or skipped. Journal entries dedupe by id.

**Share links carry the practice.** The practice and any custom poses it uses are deflated into the URL fragment. The fragment never reaches a server.

## Hosting

**One worker, `still`, on still.irshath.com.** The old yoga.irshath.com domain and its worker are gone, with no redirect. Copies of the old React app installed from that domain keep running from their cache until removed. Every push to `main` deploys.

## Discovery

**Prerendered public pages.** Link previews and many crawlers never run JavaScript. The build writes one HTML file per public route with its own title, description, canonical URL and share card, plus a plain text version of the page. The app replaces that text on boot. The text only fades in after two seconds, so a normal boot never flashes it. Personal routes such as the journal get `noindex` at runtime.

**A share card made from the real app.** `scripts/og.mjs` photographs the live UI and composes the card, so it never drifts from what people get. It is a JPEG under 300 KB because WhatsApp drops larger preview images.

**No offline-ready toast.** It announced something people never asked about, on every fresh service worker install. On some phones that meant every launch. The About page and the home footer already say the app works offline.

## Production review (2026-11-18)

Three parallel reviews (player, data, browsing) drove every flow on phone viewports in Chromium and WebKit and fixed 38 bugs, each with a failing test first where practical. The ones that shaped the design:

**Writes take a plain snapshot.** Records built from store proxies could not be cloned into IndexedDB, so edits looked saved and vanished on reload. Every write method in `src/state/app.tsx` now stores `snapshot()` output, in one place instead of in each screen.

**Every IndexedDB write commits explicitly.** Chromium drops an uncommitted transaction when the page goes away, so a setting changed just before closing the app was lost about half the time. `tx.commit()` closes that window.

**Practised time is counted, not inferred.** The journal used the play position, so skipping to the end logged the whole practice. The player state now accumulates real running time.

**Tabs keep each other in step.** Settings and favorites are written whole, so a stale tab overwrote newer changes. A `BroadcastChannel` carries them between tabs.

**Backups stream.** One `JSON.stringify` of a backup with videos exceeded the browser's string limit. Backups are now written and read in parts, and the file format is unchanged.

**Feedback and source.** About, Settings and the home footer link to an email for feedback and to the MIT-licensed source on GitHub.

## Reliability rebuild (2026-11-18)

The person reported doubled speech, two accents, practices pausing on their own, a Next button that seemed not to work, and actions that were unreliable in general.

**No effects.** Behaviour runs from taps, from timers the code starts on purpose, from `ref` callbacks and from `onCleanup`. Nothing runs because some state changed. Settings are saved, broadcast and applied to the page in `updateSettings`, the one place they change. The head tags are rendered through a `Portal` like any other view. `tests/structure.test.ts` fails if an effect comes back.

**Writes are flushed before they are read.** The client build of Solid 2 applies store writes at the end of the tick. Code that saves or applies state it just wrote calls `flush()` first. The player keeps its state in a plain variable and copies it to a signal for the screen.

**One speech queue, one voice.** The speaker in `src/engine/speech.ts` says one sentence at a time. It waits for an interrupted line to report its end before starting the next, because calling `speak()` straight after `cancel()` is when phones repeated or dropped lines. It picks one on-device voice when the practice starts and keeps it. A network voice that stalls makes the browser fall back to a different voice. Lines belong to a step, so moving on cuts off the last step's leftovers instead of letting them run on.

**Pose names by default.** Full spoken instructions overran the get-ready gaps and were cut off by the bell. Settings saved before revision 2 that still hold the old `full` default move to `names`. Full guidance stays available in Settings.

**Next moves by step.** A step is a pose or one side with its get-ready gap, a whole flow, a sit, a breath practice or a rest. The step counter, Up next, Next and Previous all use `steps()` from `src/domain/player.ts`. Before, Next from a get-ready gap landed on the same pose, and a flow took one tap per breath.

**Only the app's buttons pause a practice.** The lock-screen media session shows the current step but registers no play or pause handlers. The page cannot tell a person's tap there from one the system sends. The cause of the reported pauses was not reproduced on a desktop browser, so this is a guess.

**Each run has an id in its address.** Begin creates `?session=<id>`, so a reload resumes that run. The player no longer rewrites the address while it starts.

**Taps stay taps.** `touch-action: manipulation` on the page stops two quick taps from zooming instead. Previous and Next are 64px.

## Installing (2026-11-19)

**A guide drawn for the browser in hand.** Only Chromium browsers let a page open an install dialog. On iPhone the person has to find it themselves. Since iOS 26 it takes four taps in Safari: the ≡ button in the address bar, Share, View More, then Add to Home Screen. The drawings follow screenshots taken on a real iPhone. `installWay()` in `src/domain/install.ts` reads the browser and picks the steps. Where the browser offers its dialog, the card is one Install button.

**Drawings, not screenshots.** Each step shows a drawing of the screen with the button to tap ringed. Drawings follow the light and dark theme and weigh almost nothing offline. Screenshots from one iOS version go stale with the next.

**Asked on Today, once.** A "Get the app" card sits above the suggestion until the app is installed. "Not now" hides it from Today for two weeks. Settings and About always show it. On iPhone the guide says to install first, because the installed app keeps its own storage apart from Safari, and Safari can clear a site's data after a week away.

## Open

- Background audio and wake-lock behaviour on a real iPhone has not been tested. The e2e suite covers Chromium with stubbed APIs.
- Spoken guidance uses the device's own voices. Quality varies by device.

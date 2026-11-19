import { createSignal, Show } from 'solid-js'
import type { JSX } from '@solidjs/web'
import type { Scene } from '../domain/install'
import { promptInstall, useInstallWay } from '../pwa'
import { PATHS } from './icons'

// Drawings of the browser screens the person will see, not screenshots, so
// they follow the app's light and dark theme and stay small offline. They
// show where to tap, not every pixel of the browser.

const W = 280
const H = 180
const ICON = '/icons/icon-192.png'
const URL_TEXT = 'still.irshath.com'
const VDOTS = 'M12 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z'
const ADD_SQUARE = 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM12 8v8M8 12h8'
const INSTALL = 'M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM8 20h8M12 16v4M12 7v5M9.5 9.5 12 12l2.5-2.5'
const MENU = 'M4 7h16M4 12h16M4 17h11'
const RELOAD = 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5'
const MIC = 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3ZM19 11a7 7 0 0 1-14 0M12 18v3'
const BOOKMARK = 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'
const GLASSES = 'M6 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM18 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM9.5 12.5h5M2.5 12.5H1M23 12.5h-1.5'
const STAR = 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z'
const BOOK = 'M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z'

function Glyph(props: { d: string; x: number; y: number; size?: number; hot?: boolean }) {
  const s = () => props.size ?? 18
  return (
    <g class={['ia-glyph', { hot: props.hot }]} transform={`translate(${props.x - s() / 2} ${props.y - s() / 2}) scale(${s() / 24})`}>
      <path d={props.d} />
    </g>
  )
}

const Bar = (props: { x: number; y: number; w: number }) => <rect class="ia-faint" x={props.x} y={props.y - 4} width={props.w} height={8} rx={4} />

const Text = (props: { x: number; y: number; children: string; class?: string; anchor?: 'start' | 'middle' | 'end'; size?: number; bold?: boolean }) => (
  <text class={['ia-text', props.class]} x={props.x} y={props.y} text-anchor={props.anchor ?? 'start'} font-size={String(props.size ?? 11.5)} font-weight={props.bold ? '650' : '500'}>
    {props.children}
  </text>
)

const Page = () => (
  <>
    <rect class="ia-screen" width={W} height={H} rx={20} />
    <Bar x={20} y={24} w={140} />
    <Bar x={20} y={44} w={220} />
    <Bar x={20} y={58} w={196} />
    <Bar x={20} y={72} w={172} />
    <Bar x={20} y={94} w={206} />
  </>
)

const AppIcon = (props: { x: number; y: number; size: number }) => (
  <>
    <rect class="ia-icon-back" x={props.x} y={props.y} width={props.size} height={props.size} rx={props.size * 0.23} />
    <image href={ICON} x={props.x} y={props.y} width={props.size} height={props.size} style={{ 'clip-path': `inset(0 round ${props.size * 0.23}px)` }} />
  </>
)

// Safari's bar since iOS 26, as on the person's own phone. The page menu
// button sits inside the address field on the left.
const SafariBar = (props: { hot?: boolean }) => (
  <>
    <circle class="ia-bar" cx={30} cy={146} r={20} />
    <Glyph d={PATHS.back} x={30} y={146} size={17} />
    <rect class="ia-bar" x={58} y={126} width={164} height={40} rx={20} />
    <circle class={props.hot ? 'ia-hot-bg' : 'ia-key'} cx={80} cy={146} r={14} />
    <Glyph d={MENU} x={80} y={146} size={17} hot={props.hot} />
    <Text x={148} y={150} anchor="middle" size={12}>
      {URL_TEXT}
    </Text>
    <Glyph d={RELOAD} x={204} y={146} size={14} />
    <circle class="ia-bar" cx={250} cy={146} r={20} />
    <Glyph d={PATHS.copy} x={250} y={146} size={16} />
    <Show when={props.hot}>
      <circle class="ia-tap" cx={80} cy={146} r={19} />
    </Show>
  </>
)

const ListRow = (props: { x: number; y: number; label: string; d: string }) => (
  <>
    <Glyph d={props.d} x={props.x + 14} y={props.y} size={14} />
    <Text x={props.x + 30} y={props.y + 4} class="ia-muted">
      {props.label}
    </Text>
  </>
)

const HotRow = (props: { x: number; y: number; w: number; label: string; d: string }) => (
  <>
    <rect class="ia-hot-bg" x={props.x} y={props.y - 12} width={props.w} height={24} rx={8} />
    <Glyph d={props.d} x={props.x + 14} y={props.y} size={15} hot />
    <Text x={props.x + 30} y={props.y + 4} class="ia-hot-text" bold>
      {props.label}
    </Text>
    <rect class="ia-tap" x={props.x - 2} y={props.y - 14} width={props.w + 4} height={28} rx={10} />
  </>
)

const MenuRow = (props: { y: number; x: number; w: number; label?: string; d?: string; tap?: boolean }) => (
  <Show
    when={props.label}
    fallback={
      <>
        <circle class="ia-faint" cx={props.x + 16} cy={props.y} r={6} />
        <Bar x={props.x + 32} y={props.y} w={props.w * 0.5} />
      </>
    }
  >
    <rect class="ia-hot-bg" x={props.x + 4} y={props.y - 13} width={props.w - 8} height={26} rx={9} />
    <Glyph d={props.d!} x={props.x + 16} y={props.y} size={15} hot />
    <Text x={props.x + 32} y={props.y + 4} class="ia-hot-text" bold>
      {props.label!}
    </Text>
    <Show when={props.tap}>
      <rect class="ia-tap" x={props.x + 2} y={props.y - 15} width={props.w - 4} height={30} rx={10} />
    </Show>
  </Show>
)

const SCENES: Record<Scene, () => JSX.Element> = {
  'safari-bar': () => (
    <>
      <Page />
      <SafariBar hot />
    </>
  ),
  'safari-menu': () => (
    <>
      <Page />
      <g opacity={0.5}>
        <SafariBar />
      </g>
      <rect class="ia-card" x={56} y={8} width={168} height={108} rx={18} />
      <HotRow x={64} y={28} w={152} label="Share" d={PATHS.share} />
      <ListRow x={64} y={52} label="Copy" d={PATHS.link} />
      <ListRow x={64} y={76} label="Paste and Go" d={PATHS.copy} />
      <ListRow x={64} y={100} label="Voice Search" d={MIC} />
    </>
  ),
  'share-more': () => (
    <>
      <rect class="ia-screen" width={W} height={H} rx={20} />
      <rect class="ia-card" x={0} y={6} width={W} height={H - 6} rx={20} />
      <rect class="ia-faint" x={16} y={18} width={36} height={36} rx={8} />
      <Text x={62} y={31} size={10.5} bold>
        still. Free yoga, breathwork…
      </Text>
      <Text x={62} y={46} size={9.5} class="ia-muted">
        {URL_TEXT}
      </Text>
      <rect class="ia-key" x={0} y={64} width={W} height={1} />
      {[44, 108, 172, 236].map(x => (
        <>
          <circle class="ia-faint" cx={x} cy={88} r={14} />
          <Bar x={x - 15} y={112} w={30} />
        </>
      ))}
      {[
        [44, PATHS.copy],
        [108, BOOKMARK],
        [172, GLASSES]
      ].map(([x, d]) => (
        <>
          <circle class="ia-key" cx={x as number} cy={140} r={16} />
          <Glyph d={d as string} x={x as number} y={140} size={16} />
          <Bar x={(x as number) - 18} y={168} w={36} />
        </>
      ))}
      <circle class="ia-hot-bg" cx={236} cy={140} r={16} />
      <Glyph d={PATHS.down} x={236} y={141} size={18} hot />
      <circle class="ia-tap" cx={236} cy={140} r={21} />
      <Text x={236} y={172} anchor="middle" size={10} class="ia-hot-text" bold>
        View More
      </Text>
    </>
  ),
  'share-list': () => (
    <>
      <rect class="ia-screen" width={W} height={H} rx={20} />
      <rect class="ia-card" x={0} y={0} width={W} height={H} rx={20} />
      {[44, 108, 172, 236].map(x => (
        <circle class="ia-faint" cx={x} cy={24} r={13} />
      ))}
      <Glyph d={PATHS.up} x={236} y={24} size={14} />
      <rect class="ia-group" x={12} y={48} width={256} height={128} rx={14} />
      <ListRow x={20} y={64} label="Add Bookmark to…" d={BOOK} />
      <ListRow x={20} y={88} label="Add to Favorites" d={STAR} />
      <ListRow x={20} y={112} label="Add to Quick Note" d={PATHS.edit} />
      <ListRow x={20} y={136} label="Find on Page" d={PATHS.search} />
      <HotRow x={20} y={160} w={240} label="Add to Home Screen" d={ADD_SQUARE} />
    </>
  ),
  'safari-legacy-bar': () => (
    <>
      <Page />
      <rect class="ia-key" x={20} y={98} width={240} height={28} rx={10} />
      <Text x={140} y={116} anchor="middle">
        {URL_TEXT}
      </Text>
      <path class="ia-bar" d={`M0 134h${W}v26a20 20 0 0 1-20 20H20A20 20 0 0 1 0 160Z`} />
      <Glyph d={PATHS.back} x={30} y={156} />
      <Glyph d={PATHS.chevron} x={85} y={156} />
      <circle class="ia-hot-bg" cx={140} cy={155} r={16} />
      <Glyph d={PATHS.share} x={140} y={155} size={19} hot />
      <circle class="ia-tap" cx={140} cy={155} r={21} />
      <Glyph d={BOOK} x={195} y={156} />
      <Glyph d={PATHS.copy} x={250} y={156} />
    </>
  ),
  'chrome-ios-bar': () => (
    <>
      <rect class="ia-screen" width={W} height={H} rx={20} />
      <path class="ia-bar" d={`M0 20A20 20 0 0 1 20 0h${W - 40}a20 20 0 0 1 20 20v36H0Z`} />
      <rect class="ia-key" x={14} y={12} width={252} height={34} rx={17} />
      <Text x={124} y={33} anchor="middle">
        {URL_TEXT}
      </Text>
      <circle class="ia-hot-bg" cx={244} cy={29} r={14} />
      <Glyph d={PATHS.share} x={244} y={28} size={17} hot />
      <circle class="ia-tap" cx={244} cy={29} r={19} />
      <Bar x={20} y={78} w={150} />
      <Bar x={20} y={98} w={220} />
      <Bar x={20} y={112} w={196} />
      <Bar x={20} y={126} w={172} />
      <Bar x={20} y={148} w={206} />
    </>
  ),
  'share-sheet-legacy': () => (
    <>
      <rect class="ia-screen" width={W} height={H} rx={20} />
      <rect class="ia-card" x={0} y={18} width={W} height={H - 18} rx={20} />
      <rect class="ia-faint" x={125} y={26} width={30} height={4} rx={2} />
      {[44, 98, 152, 206].map(x => (
        <>
          <circle class="ia-faint" cx={x + 14} cy={56} r={15} />
          <Bar x={x + 2} y={82} w={24} />
        </>
      ))}
      <rect class="ia-group" x={14} y={96} width={252} height={84} rx={12} />
      <Bar x={30} y={110} w={70} />
      <circle class="ia-faint" cx={246} cy={110} r={6} />
      <rect class="ia-hot-bg" x={18} y={123} width={244} height={26} rx={9} />
      <Text x={30} y={140} class="ia-hot-text" bold>
        Add to Home Screen
      </Text>
      <Glyph d={ADD_SQUARE} x={246} y={136} size={16} hot />
      <rect class="ia-tap" x={16} y={121} width={248} height={30} rx={10} />
      <Bar x={30} y={164} w={96} />
      <circle class="ia-faint" cx={246} cy={164} r={6} />
    </>
  ),
  'add-dialog': () => (
    <>
      <rect class="ia-screen" width={W} height={H} rx={20} />
      <rect class="ia-card" x={0} y={12} width={W} height={H - 12} rx={20} />
      <Text x={22} y={42} class="ia-muted">
        Cancel
      </Text>
      <Text x={140} y={42} anchor="middle" bold>
        Add to Home Screen
      </Text>
      <circle class="ia-hot-bg" cx={248} cy={38} r={17} />
      <Text x={248} y={42} anchor="middle" class="ia-hot-text" bold>
        Add
      </Text>
      <circle class="ia-tap" cx={248} cy={38} r={21} />
      <rect class="ia-group" x={14} y={60} width={252} height={60} rx={12} />
      <AppIcon x={24} y={68} size={44} />
      <Text x={82} y={88} size={13}>
        still.
      </Text>
      <Text x={82} y={106} size={10} class="ia-muted">
        {URL_TEXT}
      </Text>
      <rect class="ia-group" x={14} y={128} width={252} height={38} rx={12} />
      <Text x={26} y={151}>
        Open as Web App
      </Text>
      <rect class="ia-on" x={216} y={136} width={40} height={22} rx={11} />
      <circle class="ia-knob" cx={245} cy={147} r={9} />
    </>
  ),
  'home-screen': () => (
    <>
      <rect class="ia-wall" width={W} height={H} rx={20} />
      {[0, 1].map(row =>
        [0, 1, 2, 3].map(col => {
          const x = 30 + col * 60
          const y = 22 + row * 76
          return row === 1 && col === 2 ? (
            <>
              <AppIcon x={x} y={y} size={44} />
              <Text x={x + 22} y={y + 62} anchor="middle" size={11} bold>
                still.
              </Text>
              <rect class="ia-tap" x={x - 4} y={y - 4} width={52} height={52} rx={14} />
            </>
          ) : (
            <>
              <rect class="ia-faint" x={x} y={y} width={44} height={44} rx={10} />
              <Bar x={x + 8} y={y + 58} w={28} />
            </>
          )
        })
      )}
    </>
  ),
  'android-bar': () => (
    <>
      <rect class="ia-screen" width={W} height={H} rx={20} />
      <path class="ia-bar" d={`M0 20A20 20 0 0 1 20 0h${W - 40}a20 20 0 0 1 20 20v36H0Z`} />
      <rect class="ia-key" x={14} y={12} width={214} height={34} rx={17} />
      <Text x={30} y={33}>
        {URL_TEXT}
      </Text>
      <circle class="ia-hot-bg" cx={252} cy={29} r={15} />
      <Glyph d={VDOTS} x={252} y={29} size={22} hot />
      <circle class="ia-tap" cx={252} cy={29} r={20} />
      <Bar x={20} y={78} w={150} />
      <Bar x={20} y={98} w={220} />
      <Bar x={20} y={112} w={196} />
      <Bar x={20} y={126} w={172} />
      <Bar x={20} y={148} w={206} />
    </>
  ),
  'android-menu': () => (
    <>
      <rect class="ia-screen" width={W} height={H} rx={20} />
      <path class="ia-bar" d={`M0 20A20 20 0 0 1 20 0h${W - 40}a20 20 0 0 1 20 20v36H0Z`} opacity={0.5} />
      <Bar x={20} y={98} w={160} />
      <Bar x={20} y={112} w={120} />
      <rect class="ia-card" x={104} y={8} width={166} height={162} rx={12} />
      <MenuRow x={104} w={166} y={32} />
      <MenuRow x={104} w={166} y={64} />
      <MenuRow x={104} w={166} y={96} label="Install app" d={INSTALL} tap />
      <MenuRow x={104} w={166} y={128} />
      <MenuRow x={104} w={166} y={156} />
    </>
  ),
  'desktop-bar': () => (
    <>
      <rect class="ia-screen" width={W} height={H} rx={14} />
      <path class="ia-wall" d={`M0 14A14 14 0 0 1 14 0h${W - 28}a14 14 0 0 1 14 14v18H0Z`} />
      <rect class="ia-bar" x={14} y={8} width={100} height={24} rx={8} />
      <Bar x={26} y={20} w={60} />
      <rect class="ia-key" x={12} y={40} width={256} height={28} rx={14} />
      <Text x={28} y={58}>
        {URL_TEXT}
      </Text>
      <circle class="ia-hot-bg" cx={250} cy={54} r={12} />
      <Glyph d={INSTALL} x={250} y={54} size={16} hot />
      <circle class="ia-tap" cx={250} cy={54} r={17} />
      <rect class="ia-card" x={112} y={78} width={158} height={92} rx={12} />
      <AppIcon x={124} y={90} size={30} />
      <Text x={162} y={102} bold>
        Install app?
      </Text>
      <Text x={162} y={117} size={9.5} class="ia-muted">
        {URL_TEXT}
      </Text>
      <rect class="ia-hot-fill" x={204} y={134} width={56} height={24} rx={12} />
      <Text x={232} y={150} anchor="middle" class="ia-on-hot" bold>
        Install
      </Text>
      <Text x={194} y={150} anchor="end" class="ia-muted">
        Cancel
      </Text>
    </>
  ),
  'mac-menu': () => (
    <>
      <rect class="ia-screen" width={W} height={H} rx={14} />
      <path class="ia-bar" d={`M0 14A14 14 0 0 1 14 0h${W - 28}a14 14 0 0 1 14 14v12H0Z`} />
      <Text x={22} y={17} bold>
        Safari
      </Text>
      <rect class="ia-hot-bg" x={64} y={4} width={36} height={18} rx={5} />
      <Text x={82} y={17} anchor="middle" class="ia-hot-text" bold>
        File
      </Text>
      <Text x={112} y={17}>
        Edit
      </Text>
      <Text x={146} y={17}>
        View
      </Text>
      <rect class="ia-card" x={62} y={28} width={176} height={142} rx={8} />
      {[46, 68, 90].map(y => (
        <Bar x={78} y={y} w={90} />
      ))}
      <rect class="ia-hot-fill" x={68} y={102} width={164} height={24} rx={5} />
      <Text x={78} y={118} class="ia-on-hot" bold>
        Add to Dock…
      </Text>
      <rect class="ia-tap" x={66} y={100} width={168} height={28} rx={7} />
      {[140, 158].map(y => (
        <Bar x={78} y={y} w={70} />
      ))}
    </>
  )
}

export function InstallArt(props: { scene: Scene }) {
  return (
    <svg class="install-art" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {SCENES[props.scene]()}
    </svg>
  )
}

const DISMISS_KEY = 'still.install-later'
const LATER_MS = 14 * 24 * 3600_000

const dismissedAt = () => {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) ?? 0)
  } catch {
    return 0
  }
}

// One card says what installing gives and leads to the one tap or the guide.
// "Not now" hides it from Today for two weeks. Settings always shows it.
export function GetTheApp(props: { dismissible?: boolean }) {
  const way = useInstallWay()
  const [later, setLater] = createSignal(props.dismissible === true && Date.now() - dismissedAt() < LATER_MS)
  const notNow = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {}
    setLater(true)
  }
  return (
    <Show when={!later() && way() !== 'installed' && way() !== 'unsupported'}>
      <section class="get-app" aria-label="Get the app">
        <img class="get-app-icon" src={ICON} alt="" width={52} height={52} />
        <div class="grow stack" style={{ gap: '10px' }}>
          <div>
            <strong>Get the app</strong>
            <p class="small muted">Put still. on your home screen. It opens full screen, works with no signal and keeps your journal safe.</p>
          </div>
          <div class="row wrap">
            <Show
              when={way() === 'prompt'}
              fallback={
                <a class="btn primary small" href="/install">
                  Show me how
                </a>
              }
            >
              <button class="btn primary small" onClick={() => void promptInstall()}>
                Install
              </button>
            </Show>
            <Show when={props.dismissible}>
              <button class="btn ghost small" onClick={notNow}>
                Not now
              </button>
            </Show>
          </div>
        </div>
      </section>
    </Show>
  )
}
